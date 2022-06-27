use cgmath::{Matrix4, Vector3};
use cgmath::{Vector2, Vector4};

use crate::healpix::coverage::HEALPixCoverage;
use crate::math::spherical::FieldOfViewType;

pub type NormalizedDeviceCoord = Vector2<f64>;
pub type WorldCoord = Vector4<f64>;
pub type ModelCoord = Vector4<f64>;

fn ndc_to_world<P: Projection>(
    ndc_coo: &[NormalizedDeviceCoord],
    ndc_to_clip: &Vector2<f64>,
    clip_zoom_factor: f64,
) -> Option<Vec<WorldCoord>> {
    // Deproject the FOV from ndc to the world space
    let mut world_coo = Vec::with_capacity(ndc_coo.len());

    for n in ndc_coo {
        let c = Vector2::new(
            n.x * ndc_to_clip.x * clip_zoom_factor,
            n.y * ndc_to_clip.y * clip_zoom_factor,
        );
        let w = P::clip_to_world_space(&c);
        if let Some(w) = w {
            world_coo.push(w);
        } else {
            // out of fov
            return None;
        }
    }

    Some(world_coo)
}
fn world_to_model(world_coo: &[WorldCoord], w2m: &Matrix4<f64>) -> Vec<ModelCoord> {
    let mut model_coo = Vec::with_capacity(world_coo.len());

    for w in world_coo.iter() {
        model_coo.push(w2m * w);
    }

    model_coo
}

fn linspace(a: f64, b: f64, num: usize) -> Vec<f64> {
    let step = (b - a) / ((num - 1) as f64);
    let mut res = vec![];
    for i in 0..num {
        res.push(a + (i as f64) * step);
    }

    res
}

const NUM_VERTICES_WIDTH: usize = 10;
const NUM_VERTICES_HEIGHT: usize = 10;
const NUM_VERTICES: usize = 4 + 2 * NUM_VERTICES_WIDTH + 2 * NUM_VERTICES_HEIGHT;
// This struct belongs to the CameraViewPort
pub struct FieldOfViewVertices {
    ndc_coo: Vec<NormalizedDeviceCoord>,
    world_coo: Option<Vec<WorldCoord>>,
    model_coo: Option<Vec<ModelCoord>>,

    // Meridians and parallels contained
    // in the field of view
    great_circles: FieldOfViewType,
    moc: HEALPixCoverage,
    depth: u8,
}

fn create_view_moc(vertices: &[Vector4<f64>], inside: &Vector3<f64>) -> HEALPixCoverage {
    let mut depth = 0;
    let mut coverage = HEALPixCoverage::new(depth, vertices, inside);

    while coverage.size() < 7 && depth < cdshealpix::DEPTH_MAX {
        depth += 1;
        coverage = HEALPixCoverage::new(depth, vertices, inside);
    }

    coverage
}

use crate::math::angle::Angle;
use al_api::coo_system::CooSystem;
impl FieldOfViewVertices {
    pub fn new<P: Projection>(
        ndc_to_clip: &Vector2<f64>,
        clip_zoom_factor: f64,
        mat: &Matrix4<f64>,
        center: &Vector4<f64>,
    ) -> Self {
        let mut x_ndc = linspace(-1., 1., NUM_VERTICES_WIDTH + 2);

        x_ndc.extend(iter::repeat(1.0).take(NUM_VERTICES_HEIGHT));
        x_ndc.extend(linspace(1., -1., NUM_VERTICES_WIDTH + 2));
        x_ndc.extend(iter::repeat(-1.0).take(NUM_VERTICES_HEIGHT));

        let mut y_ndc = iter::repeat(-1.0)
            .take(NUM_VERTICES_WIDTH + 1)
            .collect::<Vec<_>>();

        y_ndc.extend(linspace(-1., 1., NUM_VERTICES_HEIGHT + 2));
        y_ndc.extend(iter::repeat(1.0).take(NUM_VERTICES_WIDTH));
        y_ndc.extend(linspace(1., -1., NUM_VERTICES_HEIGHT + 2));
        y_ndc.pop();

        let mut ndc_coo = Vec::with_capacity(NUM_VERTICES);
        for idx_vertex in 0..NUM_VERTICES {
            ndc_coo.push(Vector2::new(x_ndc[idx_vertex], y_ndc[idx_vertex]));
        }

        let world_coo = ndc_to_world::<P>(&ndc_coo, ndc_to_clip, clip_zoom_factor);
        let model_coo = world_coo
            .as_ref()
            .map(|world_coo| world_to_model(world_coo, mat));


        let (great_circles, moc) = if let Some(vertices) = &model_coo {
            (FieldOfViewType::new_polygon(vertices, &center), create_view_moc(vertices, &center.truncate()))
        } else {
            (FieldOfViewType::Allsky, HEALPixCoverage::allsky())
        };

        let depth = moc.get_depth_max();

        FieldOfViewVertices {
            ndc_coo,
            world_coo,
            model_coo,
            great_circles,
            moc,
            depth
        }
    }

    pub fn set_fov<P: Projection>(
        &mut self,
        ndc_to_clip: &Vector2<f64>,
        clip_zoom_factor: f64,
        w2m: &Matrix4<f64>,
        aperture: Angle<f64>,
        system: &CooSystem,
        center: &Vector4<f64>,
    ) {
        self.world_coo = ndc_to_world::<P>(&self.ndc_coo, ndc_to_clip, clip_zoom_factor);
        self.set_rotation::<P>(w2m, aperture, system, center);
    }

    pub fn set_rotation<P: Projection>(
        &mut self,
        w2m: &Matrix4<f64>,
        aperture: Angle<f64>,
        system: &CooSystem,
        center: &Vector4<f64>,
    ) {
        if let Some(world_coo) = &self.world_coo {
            self.model_coo = Some(world_to_model(world_coo, w2m));
        } else {
            self.model_coo = None;
        }

        self.set_great_circles::<P>(aperture, system, center);
    }

    fn set_great_circles<P: Projection>(
        &mut self,
        aperture: Angle<f64>,
        _system: &CooSystem,
        center: &Vector4<f64>,
    ) {
        if aperture < P::RASTER_THRESHOLD_ANGLE {
            if let Some(vertices) = &self.model_coo {
                self.great_circles = FieldOfViewType::new_polygon(&vertices, center);
                self.moc = create_view_moc(vertices, &center.truncate());
                self.depth = self.moc.get_depth_max();

            } else if let FieldOfViewType::Polygon { .. } = &self.great_circles {
                self.great_circles = FieldOfViewType::Allsky;
                self.moc = HEALPixCoverage::allsky();
                self.depth = self.moc.get_depth_max();
            }
        } else {
            // We are too unzoomed => we plot the allsky grid
            if let FieldOfViewType::Polygon { .. } = &self.great_circles {
                self.great_circles = FieldOfViewType::Allsky;
                self.moc = HEALPixCoverage::allsky();
                self.depth = self.moc.get_depth_max();

            }
        }
    }

    pub fn get_depth(&self) -> u8 {
        self.depth
    }

    pub fn get_vertices(&self) -> Option<&Vec<ModelCoord>> {
        self.model_coo.as_ref()
    }

    pub fn get_bounding_box(&self) -> &BoundingBox {
        self.great_circles.get_bounding_box()
    }

    pub fn get_coverage(&self) -> &HEALPixCoverage {
        &self.moc
    }

    pub fn _type(&self) -> &FieldOfViewType {
        &self.great_circles
    }
}
use crate::math::{projection::Projection, spherical::BoundingBox};
use std::iter;
