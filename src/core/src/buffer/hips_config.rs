use al_core::{format::ImageFormat, image::ImageBuffer};
#[derive(Clone, Debug)]
pub struct TileConfig<F>
where
    F: ImageFormat,
{
    // The size of the tile in the texture
    size: i32,
    default: Rc<ImageBuffer<F>>,
    pixel_fill: <F as ImageFormat>::P,
}
use al_core::{pixel::Pixel};
impl<F> TileConfig<F>
where
    F: ImageFormat,
{
    fn new(size: i32) -> TileConfig<F> {
        debug_assert!(math::is_power_of_two(size as usize));
        let pixel_fill = <<F as ImageFormat>::P as Pixel>::BLACK;
        let default = Rc::new(ImageBuffer::<F>::allocate(&pixel_fill, size, size));
        TileConfig {
            size,
            default,
            pixel_fill,
        }
    }

    #[inline]
    pub fn get_default_tile(&self) -> Rc<ImageBuffer<F>> {
        self.default.clone()
    }
}

#[cfg(feature = "webgl2")]
use al_core::format::{R16I, R32I, R8UI};

#[cfg(feature = "webgl2")]
#[derive(Debug)]
#[allow(dead_code)]
pub enum TileConfigType {
    RGBA8U { config: TileConfig<RGBA8U> },
    RGB8U { config: TileConfig<RGB8U> },
    R32F { config: TileConfig<R32F> },
    R8UI { config: TileConfig<R8UI> },
    R16I { config: TileConfig<R16I> },
    R32I { config: TileConfig<R32I> },
}
#[cfg(feature = "webgl1")]
#[derive(Debug)]
#[allow(dead_code)]
pub enum TileConfigType {
    RGBA8U { config: TileConfig<RGBA8U> },
    RGB8U { config: TileConfig<RGB8U> },
    R32F { config: TileConfig<R32F> },
}

use al_core::format::{ImageFormatType, R32F, RGB8U, RGBA8U};

#[cfg(feature = "webgl2")]
impl TileConfigType {
    fn format(&self) -> ImageFormatType {
        match self {
            TileConfigType::RGBA8U { .. } => ImageFormatType::RGBA8U,
            TileConfigType::RGB8U { .. } => ImageFormatType::RGB8U,
            TileConfigType::R32F { .. } => ImageFormatType::R32F,
            TileConfigType::R8UI { .. } => ImageFormatType::R8UI,
            TileConfigType::R16I { .. } => ImageFormatType::R16I,
            TileConfigType::R32I { .. } => ImageFormatType::R32I,
        }
    }
    fn width(&self) -> i32 {
        match self {
            TileConfigType::RGBA8U { config } => config.size,
            TileConfigType::RGB8U { config } => config.size,
            TileConfigType::R32F { config } => config.size,
            TileConfigType::R8UI { config } => config.size,
            TileConfigType::R16I { config } => config.size,
            TileConfigType::R32I { config } => config.size,
        }
    }
}
#[cfg(feature = "webgl1")]
impl TileConfigType {
    fn format(&self) -> ImageFormatType {
        match self {
            TileConfigType::RGBA8U { .. } => ImageFormatType::RGBA8U,
            TileConfigType::RGB8U { .. } => ImageFormatType::RGB8U,
            TileConfigType::R32F { .. } => ImageFormatType::R32F,
        }
    }
    fn width(&self) -> i32 {
        match self {
            TileConfigType::RGBA8U { config } => config.width,
            TileConfigType::RGB8U { config } => config.width,
            TileConfigType::R32F { config } => config.width,
        }
    }
}

//use super::TileArrayBuffer;
use crate::WebGlContext;
use std::rc::Rc;

/*use super::{ArrayF32, ArrayF64, ArrayI16, ArrayI32, ArrayU8};
fn create_black_tile(format: FormatImageType, width: i32, value: f32) -> TileArrayBufferImage {
    let _num_channels = format.get_num_channels() as i32;
    match format {
        FormatImageType::JPG => TileArrayBufferImage::U8(JPG::create_black_tile(width)),
        FormatImageType::PNG => TileArrayBufferImage::U8(PNG::create_black_tile(width)),
        FormatImageType::FITS(_fits) => match format.get_type() {
            WebGl2RenderingContext::FLOAT => {
                TileArrayBufferImage::F32(FITS::create_black_tile(width, value))
            }
            WebGl2RenderingContext::INT => {
                TileArrayBufferImage::I32(FITS::create_black_tile(width, value as i32))
            }
            WebGl2RenderingContext::SHORT => {
                TileArrayBufferImage::I16(FITS::create_black_tile(width, value as i16))
            }
            WebGl2RenderingContext::UNSIGNED_BYTE => {
                TileArrayBufferImage::U8(FITS::create_black_tile(width, value as u8))
            }
            _ => unimplemented!(),
        },
        _ => unimplemented!(),
    }
}*/

#[derive(Debug)]
pub struct HiPSConfig {
    pub root_url: String,
    // HiPS image format
    pub tile_config: TileConfigType,

    // The size of the texture images
    pub texture_size: i32,

    // Longitude reversed
    pub longitude_reversed: bool,
    // Delta depth i.e. log2(texture_size / tile_size)
    delta_depth: u8,
    // Num tiles per texture
    num_tiles_per_texture: usize,
    // Max depth of the current HiPS tiles
    max_depth_tile: u8,
    max_depth_texture: u8,
    num_textures_by_side_slice: i32,
    num_textures_by_slice: i32,
    num_slices: i32,
    num_textures: usize,

    // TODO: store this values in the ImageSurvey
    // These are proper to the survey (FITS one) and not
    // to a specific survey color
    pub scale: f32,
    pub offset: f32,
    pub blank: f32,

    pub tex_storing_integers: bool,
    pub tex_storing_fits: bool,
    pub tex_storing_unsigned_int: bool,

    pub size_tile_uv: f32,
    pub frame: CooSystem
}

use al_api::coo_system::CooSystem;
use crate::math;
use crate::{HiPSProperties};
use al_api::hips::HiPSTileFormat;
use wasm_bindgen::JsValue;

impl HiPSConfig {
    /// Define a HiPS configuration
    ///
    /// # Arguments
    ///
    /// * `properties` - A description of the HiPS, its metadata, available formats  etc...
    /// * `img_format` - Image format wanted by the user
    pub fn new(properties: &HiPSProperties, img_format: HiPSTileFormat) -> Result<HiPSConfig, JsValue> {
        let root_url = properties.get_url();
        // Define the size of the 2d texture array depending on the
        // characterics of the client
        let num_textures_by_side_slice = 8;
        let num_textures_by_slice = num_textures_by_side_slice * num_textures_by_side_slice;
        let num_slices = 3;
        let num_textures = (num_textures_by_slice * num_slices) as usize;

        let max_depth_tile = properties.get_max_order();
        let tile_size = properties.get_tile_size();
        // Assert size is a power of two
        // Determine the size of the texture to copy
        // it cannot be > to 512x512px

        let fmt = properties.get_formats();
        let longitude_reversed = properties.longitude_reversed;
        let bitpix = properties.get_bitpix();
        let mut tex_storing_unsigned_int = false;
        let mut tex_storing_integers = false;

        let mut tex_storing_fits = false;
        
        
        if !properties.get_formats().contains(&img_format) {
            return Err(js_sys::Error::new("HiPS format not available").into());
        }

        let tile_config: Result<_, JsValue> = match img_format {
            HiPSTileFormat::FITS => {
                tex_storing_fits = true;
                // Check the bitpix to determine the internal format of the tiles
                if let Some(bitpix) = bitpix {
                    match bitpix {
                        #[cfg(feature = "webgl2")]
                        8 => {
                            tex_storing_unsigned_int = true;
                            Ok(TileConfigType::R8UI {
                                config: TileConfig::<R8UI>::new(tile_size),
                            })
                        }
                        #[cfg(feature = "webgl2")]
                        16 => {
                            tex_storing_integers = true;
                            Ok(TileConfigType::R16I {
                                config: TileConfig::<R16I>::new(tile_size),
                            })
                        }
                        #[cfg(feature = "webgl2")]
                        32 => {
                            tex_storing_integers = true;
                            Ok(TileConfigType::R32I {
                                config: TileConfig::<R32I>::new(tile_size),
                            })
                        }
                        -32 => {
                            tex_storing_integers = false;
                            Ok(TileConfigType::R32F {
                                config: TileConfig::<R32F>::new(tile_size),
                            })
                        }
                        -64 => {
                            tex_storing_integers = false;
                            Ok(TileConfigType::R32F {
                                config: TileConfig::<R32F>::new(tile_size),
                            })
                        }
                        _ => Err(
                            "Fits tiles exists but the BITPIX is not correct in the property file"
                                .to_string()
                                .into()
                        ),
                    }
                } else {
                    Err(
                        "Fits tiles exists but the BITPIX is not found"
                            .to_string()
                            .into()
                    )
                }
            },
            HiPSTileFormat::PNG => {
                Ok(TileConfigType::RGBA8U {
                    config: TileConfig::<RGBA8U>::new(tile_size),
                })
            },
            HiPSTileFormat::JPEG => {
                Ok(TileConfigType::RGB8U {
                    config: TileConfig::<RGB8U>::new(tile_size),
                })
            }
        };
        let tile_config = tile_config?;

        let texture_size = std::cmp::min(512, tile_size << max_depth_tile);
        let num_tile_per_side_texture = (texture_size / tile_size) as usize;

        let delta_depth = crate::math::log_2_unchecked(num_tile_per_side_texture) as u8;
        let num_tiles_per_texture = num_tile_per_side_texture * num_tile_per_side_texture;

        let max_depth_texture = max_depth_tile - delta_depth;
        let size_tile_uv = 1_f32 / ((8 << delta_depth) as f32);

        let frame = properties.get_frame();

        let hips_config = HiPSConfig {
            // HiPS name
            root_url,
            // Tile size & blank tile data
            tile_config,
            longitude_reversed,
            // Texture config
            // The size of the texture images
            texture_size,
            // Delta depth i.e. log2(texture_size / tile_size)
            delta_depth,
            // Num tiles per texture
            num_tiles_per_texture,
            // Max depth of the current HiPS tiles
            max_depth_texture,
            max_depth_tile,
            num_textures_by_side_slice,
            num_textures_by_slice,
            num_slices,
            num_textures,

            scale: 1.0,
            offset: 0.0,
            blank: -1.0, // by default, set it to -1

            tex_storing_fits,
            tex_storing_integers,
            tex_storing_unsigned_int,

            size_tile_uv,
            frame
        };

        Ok(hips_config)
    }

    #[inline]
    pub fn set_fits_metadata(&mut self, bscale: f32, bzero: f32, blank: f32) {
        self.scale = bscale;
        self.offset = bzero;
        self.blank = blank;
    }

    #[inline]
    pub fn delta_depth(&self) -> u8 {
        self.delta_depth
    }

    #[inline]
    pub fn num_tiles_per_texture(&self) -> usize {
        self.num_tiles_per_texture
    }

    #[inline]
    pub fn get_texture_size(&self) -> i32 {
        self.texture_size
    }

    #[inline]
    pub fn get_tile_size(&self) -> i32 {
        self.tile_config.width()
    }
    /*
        #[inline]
        pub fn get_black_tile(&self) -> Rc<TileArrayBufferImage> {
            self.tile_config.get_black_tile()
        }
    */
    #[inline]
    pub fn get_max_depth(&self) -> u8 {
        self.max_depth_texture
    }

    #[inline]
    pub fn get_frame(&self) -> CooSystem {
        self.frame
    }

    /*#[inline]
    pub fn get_max_tile_depth(&self) -> u8 {
        self.max_depth_tile
    }*/

    #[inline]
    pub fn num_textures(&self) -> usize {
        self.num_textures
    }

    #[inline]
    pub fn num_textures_by_side_slice(&self) -> i32 {
        self.num_textures_by_side_slice
    }

    #[inline]
    pub fn num_textures_by_slice(&self) -> i32 {
        self.num_textures_by_slice
    }

    #[inline]
    pub fn num_slices(&self) -> i32 {
        self.num_slices
    }

    #[inline]
    pub fn format(&self) -> ImageFormatType {
        self.tile_config.format()
    }
}

use al_core::shader::{SendUniforms, ShaderBound};

impl SendUniforms for HiPSConfig {
    fn attach_uniforms<'a>(&self, shader: &'a ShaderBound<'a>) -> &'a ShaderBound<'a> {
        // Send max depth
        shader
            .attach_uniform("max_depth", &(self.max_depth_texture as i32))
            .attach_uniform("size_tile_uv", &self.size_tile_uv)
            .attach_uniform("tex_storing_fits", &self.tex_storing_fits)
            .attach_uniform("scale", &self.scale)
            .attach_uniform("offset", &self.offset)
            .attach_uniform("blank", &self.blank);
            //.attach_uniform("inversed_longitude", &self.longitude_reversed);

        shader
    }
}
