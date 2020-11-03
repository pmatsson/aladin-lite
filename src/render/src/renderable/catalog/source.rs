
#[derive(Debug)]
#[derive(Clone, PartialEq)]
#[repr(C)]
pub struct Source {
    x: f32,
    y: f32,
    z: f32,

    pub lon: f32,
    pub lat: f32,

    //pub mag: f32,
}

impl Source {
    pub const fn num_f32() -> usize {
        std::mem::size_of::<Self>() / std::mem::size_of::<f32>()
    }
}

impl Eq for Source {}

use crate::renderable::Angle;
use crate::math;
impl Source {
    pub fn new(lon: Angle<f32>, lat: Angle<f32>/*, mag: f32*/) -> Source {
        let world_pos = math::radec_to_xyz(lon, lat);

        let x = world_pos.x;
        let y = world_pos.y;
        let z = world_pos.z;

        let lon = lon.0;
        let lat = lat.0;

        Source {
            x,
            y,
            z,

            lon,
            lat,

            //mag
        }
    }
}

use crate::renderable::ArcDeg;
impl From<&[f32]> for Source {
    fn from(data: &[f32]) -> Source {
        let lon = ArcDeg(data[0]).into();
        let lat = ArcDeg(data[1]).into();
        //let mag = data[3];

        Source::new(lon, lat/*, mag*/)
    }
}
