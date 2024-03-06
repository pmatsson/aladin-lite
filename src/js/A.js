// Copyright 2013 - UDS/CNRS
// The Aladin Lite program is distributed under the terms
// of the GNU General Public License version 3.
//
// This file is part of Aladin Lite.
//
//    Aladin Lite is free software: you can redistribute it and/or modify
//    it under the terms of the GNU General Public License as published by
//    the Free Software Foundation, version 3 of the License.
//
//    Aladin Lite is distributed in the hope that it will be useful,
//    but WITHOUT ANY WARRANTY; without even the implied warranty of
//    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
//    GNU General Public License for more details.
//
//    The GNU General Public License is available in COPYING file
//    along with Aladin Lite.
//


/******************************************************************************
 * Aladin Lite project
 *
 * File Aladin.js (main class)
 * Facade to expose Aladin Lite methods
 *
 * Author: Thomas Boch[CDS]
 *
 *****************************************************************************/

import { MOC } from "./MOC.js";
import { Overlay } from "./Overlay.js";
import { Circle } from "./Circle.js";
import { Ellipse } from "./Ellipse.js";
import { Polyline } from "./Polyline.js";
import { Catalog } from "./Catalog.js";
import { ProgressiveCat } from "./ProgressiveCat.js";
import { Source } from "./Source.js";
import { Coo } from "./libs/astro/coo.js";
import { URLBuilder } from "./URLBuilder.js";
import { ColorCfg } from './ColorCfg.js';
import { Footprint } from './Footprint.js';
import { Aladin } from "./Aladin.js";
import { ActionButton } from "./gui/Widgets/ActionButton.js";
import { Box } from "./gui/Widgets/Box.js";
// Wasm top level import
import init, * as module from './../core/pkg';

// Import aladin css inside the project
import './../css/aladin.css';


///////////////////////////////
/////// Aladin Lite API ///////
///////////////////////////////

/**
 * @namespace A
 * @description Aladin Lite API namespace for creating celestial objects.
 * @example
 * // Usage example:
 * import { A } from 'aladin-lite';
 *
 * const aladin = new A.aladin("#aladin-lite-div", { survey: 'your survey url', fov: 180, projection: 'SIN' });
 */
let A = {};

//// New API ////
// For developers using Aladin lite: all objects should be created through the API,
// rather than creating directly the corresponding JS objects
// This facade allows for more flexibility as objects can be updated/renamed harmlessly

/**
 * Creates an Aladin Lite instance within the specified HTML element.
 *
 * @function
 * @name A.aladin
 * @memberof A
 * @param {string|HTMLElement} divSelector - The ID selector for the HTML element or the HTML element itself
 * @param {AladinOptions} [options] - Options for configuring the Aladin Lite instance.
 * @returns {Aladin} An instance of the Aladin Lite library.
 * @example
 *  var aladin;
 *  A.init.then(() => {
 *      aladin = A.aladin('#aladin-lite-div', {fullScreen: true, cooFrame: "ICRSd", showSimbadPointerControl: true, showShareControl: true, showShareControl: true, survey: 'https://alasky.cds.unistra.fr/DSS/DSSColor/', fov: 180, showContextMenu: true});
 *  })
 */
A.aladin = function (divSelector, options) {
    let divElement;
    if (!(divSelector instanceof HTMLElement)) {
        divElement = document.querySelector(divSelector)
    } else {
        divElement = divSelector;
    }
    return new Aladin(divElement, options);
};

/**
 * Creates a celestial source object with the given coordinates.
 *
 * @function
 * @name A.source
 * @memberof A
 * @param {number} ra - Right Ascension (RA) coordinate in degrees.
 * @param {number} dec - Declination (Dec) coordinate in degrees.
 * @param {*} [data] - Additional data associated with the source.
 * @param {SourceOptions} [options] - Options for configuring the source object.
 * @returns {Source} A celestial source object.
 * @example
 * const sourceObj = A.source(180.0, 30.0, data, options);
 */
A.source = function (ra, dec, data, options) {
    return new Source(ra, dec, data, options);
};

/**
 * Creates a marker at the specified celestial coordinates.
 *
 * @function
 * @name A.marker
 * @memberof A
 * @param {number} ra - Right Ascension (RA) coordinate in degrees.
 * @param {number} dec - Declination (Dec) coordinate in degrees.
 * @param {MarkerOptions} [options] - Options for configuring the marker.
 * @param {*} [data] - Additional data associated with the marker.
 * @returns {Source} A marker source object.
 * @example
 * const markerObj = A.marker(180.0, 30.0, data, options);
 */
A.marker = function (ra, dec, options, data) {
    options = options || {};
    options['marker'] = true;
    return A.source(ra, dec, data, options);
};

/**
 * Creates a polygon object using an array of celestial coordinates (RA, Dec).
 *
 * @function
 * @memberof A
 * @name polygon
 *
 * @param {Array} raDecArray - Array of celestial coordinates representing the vertices of the polygon.
 *   Each element should be an object with properties `ra` (Right Ascension) in degrees and `dec` (Declination) in degrees.
 * @param {Object} options - Options for configuring the polygon.
 * @throws {string} Throws an error if the number of vertices is less than 3.
 */
A.polygon = function (raDecArray, options) {
    const numVertices = raDecArray.length;

    if (numVertices < 3) {
        // Cannot define a polygon from that
        throw 'Cannot define a polygon from less than 3 vertices';
    }

    const lastVertexIdx = numVertices - 1;

    // User gave a closed polygon, so we remove the last vertex
    if (raDecArray[0][0] == raDecArray[lastVertexIdx][0] && raDecArray[0][1] == raDecArray[lastVertexIdx][1]) {
        raDecArray.pop()
        // but declare the polygon as closed
    }

    options = options || {};
    options.closed = true;

    return new Polyline(raDecArray, options);
};

/**
 * Creates a polyline object using an array of celestial coordinates (RA, Dec).
 *
 * @function
 * @memberof A
 * @name polyline
 *
 * @param {Array} raDecArray - Array of celestial coordinates representing the vertices of the polyline.
 *   Each element should be an object with properties `ra` (Right Ascension) in degrees and `dec` (Declination) in degrees.
 * @param {Object} options - Options for configuring the polyline.
 */
A.polyline = function (raDecArray, options) {
    return new Polyline(raDecArray, options);
};


/**
 * Creates a circle object
 *
 * @function
 * @memberof A
 * @name circle
 *
 * @param {number} ra - Right Ascension (RA) coordinate of the center in degrees.
 * @param {number} dec - Declination (Dec) coordinate of the center in degrees.
 * @param {number} radiusDeg - Radius in degrees.

 * @param {Object} options - Options for configuring the circle.
 */
A.circle = function (ra, dec, radiusDeg, options) {
    return new Circle([ra, dec], radiusDeg, options);
};

/**
 * Creates a ellipse object
 *
 * @function
 * @memberof A
 * @name ellipse
 *
 * @param {number} ra - Right Ascension (RA) coordinate of the center in degrees.
 * @param {number} dec - Declination (Dec) coordinate of the center in degrees.
 * @param {number} radiusRaDeg - the radius along the ra axis in degrees
 * @param {number} radiusDecDeg - the radius along the dec axis in degrees
 * @param {number} rotationDeg - the rotation angle in degrees

 * @param {Object} options - Options for configuring the ellipse.
 */
A.ellipse = function (ra, dec, radiusRaDeg, radiusDecDeg, rotationDeg, options) {
    return new Ellipse([ra, dec], radiusRaDeg, radiusDecDeg, rotationDeg, options);
};

/**
 * Creates a graphic overlay on the Aladin Lite view.
 *
 * @function
 * @memberof A
 * @name graphicOverlay
 *
 * @param {Object} options - Options for configuring the graphic overlay.
 * @param {string} [options.color] - The color of the graphic overlay.
 * @param {number} [options.lineWidth] - The width of the lines in the graphic overlay.
 * @returns {Overlay} Returns a new Overlay object representing the graphic overlay.
 *
 * @example
 * var overlay = A.graphicOverlay({ color: '#ee2345', lineWidth: 3 });
 */
A.graphicOverlay = function (options) {
    return new Overlay(options);
};

/**
 * Creates progressive catalog object (i.e. Simbad/Gaia)
 *
 * @function
 * @memberof A
 * @name catalogHiPS
 *
 * @param {string} url - Root url of the catalog
 * @param {CatalogOptions} options - Options for configuring the catalogue.
 * @returns {ProgressiveCat} Returns a new Overlay object representing the graphic overlay.
 *
 * @example
 * let gaia = A.catalogHiPS('http://axel.u-strasbg.fr/HiPSCatService/I/345/gaia2', {onClick: 'showTable', color: 'orange', name: 'Gaia', filter: myFilterFunction});
 * aladin.addCatalog(gaia)
 */
A.catalogHiPS = function (url, options) {
    return new ProgressiveCat(url, null, null, options);
};

/**
 * Creates a new coo from a longitude and latitude given in degrees
 *
 * @function
 * @memberof A
 * @name coo
 *
 * @param {number} longitude - longitude (decimal degrees)
 * @param {number} latitude - latitude (decimal degrees)
 * @param {number} prec - precision
 * (8: 1/1000th sec, 7: 1/100th sec, 6: 1/10th sec, 5: sec, 4: 1/10th min, 3: min, 2: 1/10th deg, 1: deg
 * @returns {Coo} Returns a new Coo object
 */
A.coo = function (longitude, latitude, prec) {
    return new Coo(longitude, latitude, prec);
};

// API
A.footprint = function(shapes, source) {
    return new Footprint(shapes, source);
};

// API
A.footprintsFromSTCS = function (stcs, options) {
    var footprints = Overlay.parseSTCS(stcs, options);

    return footprints;
}

// API
A.MOCFromURL = function (url, options, successCallback) {
    var moc = new MOC(options);
    moc.parse(url, successCallback);

    return moc;
};

// API
A.MOCFromJSON = function (jsonMOC, options, successCallback, errorCallback) {
    var moc = new MOC(options);
    moc.parse(jsonMOC, successCallback, errorCallback);

    return moc;
};

// API
A.MOCFromCircle = function (circle, options, successCallback, errorCallback) {
    var moc = new MOC(options);
    moc.parse(circle, successCallback, errorCallback);

    return moc;
};

A.MOCFromPolygon= function (polygon, options, successCallback, errorCallback) {
    var moc = new MOC(options);
    moc.parse(polygon, successCallback, errorCallback);

    return moc;
};

/**
 * Represents options for configuring a catalog.
 *
 * @typedef {Object} CatalogOptions
 * @property {string} url - The URL of the catalog.
 * @property {string} [name="catalog"] - The name of the catalog.
 * @property {string} [color] - The color associated with the catalog.
 * @property {number} [sourceSize=8] - The size of the sources in the catalog.
 * @property {number} [markerSize=12] - The size of the markers associated with sources.
 * @property {string} [shape="square"] - The shape of the sources (e.g., "square", "circle", "rhomb", "triangle", "cross").
 * @property {number} [limit] - The maximum number of sources to display.
 * @property {function} [onClick] - The callback function to execute on a source click.
 * @property {boolean} [readOnly=false] - Whether the catalog is read-only.
 * @property {string} [raField] - The ID or name of the field holding Right Ascension (RA).
 * @property {string} [decField] - The ID or name of the field holding Declination (dec).
 * @property {function} [filter] - The filtering function for sources. Returns a boolean
 * @property {boolean} [displayLabel=false] - Whether to display labels for sources.
 * @property {string} [labelColor] - The color of the source labels.
 * @property {string} [labelFont="10px sans-serif"] - The font for the source labels.
 */

/**
 * Represents a catalog with configurable options for display and interaction.
 *
 * @function
 * @name A.catalog
 * @memberof A
 * @param {CatalogOptions} options - Configuration options for the catalog.
 * @returns {Catalog}
 */
A.catalog = function (options) {
    return new Catalog(options);
};

/**
 * Asynchronously creates a new catalog instance from the specified URL with additional options.
 *
 * @function
 * @memberof A
 * @name A.catalogFromURL
 * @param {string} url - The URL of the catalog.
 * @param {CatalogOptions} [options] - Additional configuration options for the catalog.
 * @param {function} [successCallback] - The callback function to execute on successful catalog creation.
 * @param {function} [errorCallback] - The callback function to execute on error during catalog creation.
 * @param {boolean} [useProxy=false] - Indicates whether to use a proxy for loading the catalog.
 * @returns {Catalog} A new instance of the Catalog class created from the specified URL.
 *
 * @example
 * // Create a catalog from a URL using the A.catalogFromURL method
 * const catalogURL = "https://example.com/catalog";
 * const catalogOptions = {
 *   name: "My Catalog",
 *   color: "#ff0000",
 *   sourceSize: 10,
 *   // ... other options
 * };
 *
 * const myCatalog = A.catalogFromURL(
 *   catalogURL,
 *   catalogOptions,
 *   (catalog) => {
 *     // Catalog successfully loaded
 *     aladin.addCatalog(catalog)
 *   },
 *   (error) => {
 *     // Error loading catalog
 *     console.error("Error loading catalog:", error);
 *   },
 * );
 */
A.catalogFromURL = function (url, options, successCallback, errorCallback, useProxy) {
    options.url = url;
    var catalog = A.catalog(options);
    const processVOTable = function (table) {
        let {sources, footprints, fields, type} = table;
        catalog.setFields(fields);

        if (catalog.type === 'ObsCore') {
            // The fields corresponds to obscore ones
            // Set the name of the catalog to be ObsCore:<catalog name>
            catalog.name = "ObsCore:" + url;
        }

        catalog.addFootprints(footprints)
        catalog.addSources(sources);

        if (successCallback) {
            successCallback(catalog);
        }

        if (sources.length === 0) {
            console.warn(catalog.name + ' has no sources!')
        }

        // Even if the votable is not a proper ObsCore one, try to see if specific columns are given
        // e.g. access_format and access_url
        //ObsCore.handleActions(catalog);
    };

    if (useProxy !== undefined) {
        Catalog.parseVOTable(
            url,
            processVOTable,
            errorCallback,
            catalog.maxNbSources,
            useProxy,
            catalog.raField, catalog.decField
        );
    } else {
        Catalog.parseVOTable(
            url,
            processVOTable,
            () => {
                Catalog.parseVOTable(
                    url,
                    processVOTable,
                    errorCallback,
                    catalog.maxNbSources,
                    true,
                    catalog.raField, catalog.decField
                );
            },
            catalog.maxNbSources,
            false,
            catalog.raField, catalog.decField
        );
    }

    return catalog;
};

/**
 * Create a catalog from a SIMBAD cone search query
 *
 * @function
 * @memberof A
 * @name A.catalogFromSimbad
 * @param {string|Object} target - can be either a string representing a position or an object name, or can be an object with keys 'ra' and 'dec' (values being in decimal degrees)
 * @param {number} target.ra - Right Ascenscion in degrees of the cone's center
 * @param {number} target.dec - Declination in degrees of the cone's center
 * @param {number} radius - Radius of the cone in degrees
 * @param {Object|CatalogOptions} [options] - Additional configuration options for SIMBAD cone search. See the {@link https://simbad.cds.unistra.fr/cone/help/#/ConeSearch/get_ SIMBAD cone search} parameters.
 * @param {Object} [options.limit] - The max number of sources to return
 * @param {Object} [options.orderBy] - Order the result by specific
 *
 * @param {function} [successCallback] - The callback function to execute on successful catalog creation.
 * @param {function} [errorCallback] - The callback function to execute on error during catalog creation.
 * @returns {Catalog} A new instance of the Catalog class created from the SIMBAD cone search.
 *
 * @example
 *  A.catalogFromSimbad('09 55 52.4 +69 40 47', 0.1, {onClick: 'showTable', limit: 1000}, (cat) => {
 *      aladin.addCatalog(cat)
 *  });
 */
A.catalogFromSimbad = function (target, radius, options, successCallback, errorCallback) {
    options = options || {};
    if (!('name' in options)) {
        options['name'] = 'Simbad';
    }

    return new Promise((resolve, reject) => {
        let coo;
        if (target && (typeof target  === "object")) {
            if ('ra' in target && 'dec' in target) {
                coo = new Coo(target.ra, target.dec, 7);
                resolve(coo)
            }
        } else {
            var isObjectName = /[a-zA-Z]/.test(target);
    
            // Try to parse as a position
            if (!isObjectName) {
                coo = new Coo();
                coo.parse(target);
                resolve(coo);
            } else {
                // object name, use sesame
                Sesame.resolve(target,
                    function (data) { // success callback
                        // Location given in icrs at J2000
                        coo = new Coo(data.coo.jradeg, data.coo.jdedeg);
                        resolve(coo)
                    },
                    function (data) { // errror callback
                        if (console) {
                            console.log("Could not resolve object name " + target);
                            console.log(data);
                        }

                        reject(data)
                    }
                );
            }
        }
    }).then((coo) => {
        const url = URLBuilder.buildSimbadCSURL(coo.lon, coo.lat, radius, options)
        return A.catalogFromURL(url, options, successCallback, errorCallback, false);
    })
};

/**
 * Create a catalog from a NED cone search query
 *
 * @function
 * @memberof A
 * @name A.catalogFromNED
 * @param {string|Object} target - can be either a string representing a position or an object name, or can be an object with keys 'ra' and 'dec' (values being in decimal degrees)
 * @param {number} target.ra - Right Ascenscion in degrees of the cone's center
 * @param {number} target.dec - Declination in degrees of the cone's center
 * @param {number} radius - Radius of the cone in degrees
 * @param {CatalogOptions} [options] - Additional configuration options for the catalogue.
 *
 * @param {function} [successCallback] - The callback function to execute on successful catalog creation.
 * @param {function} [errorCallback] - The callback function to execute on error during catalog creation.
 * @returns {Catalog}
 *
 * @example
 * A.catalogFromNED('09 55 52.4 +69 40 47', 0.1, {onClick: 'showPopup', shape: 'plus'})
 */
A.catalogFromNED = function (target, radius, options, successCallback, errorCallback) {
    options = options || {};
    if (!('name' in options)) {
        options['name'] = 'NED';
    }
    var url;
    if (target && (typeof target === "object")) {
        if ('ra' in target && 'dec' in target) {
            url = URLBuilder.buildNEDPositionCSURL(target.ra, target.dec, radius);
        }
    }
    else {
        var isObjectName = /[a-zA-Z]/.test(target);
        if (isObjectName) {
            url = URLBuilder.buildNEDObjectCSURL(target, radius);
        }
        else {
            var coo = new Coo();
            coo.parse(target);
            url = URLBuilder.buildNEDPositionCSURL(coo.lon, coo.lat, radius);
        }
    }

    return A.catalogFromURL(url, options, successCallback, errorCallback, true);
};

/**
 * Create a catalog from a SKAORucio cone search query
 *
 * @function
 * @memberof A
 * @name A.catalogFromSKAORucio
 * @param {string|Object} target - can be either a string representing a position or an object name, or can be an object with keys 'ra' and 'dec' (values being in decimal degrees)
 * @param {number} target.ra - Right Ascenscion in degrees of the cone's center
 * @param {number} target.dec - Declination in degrees of the cone's center
 * @param {number} radiusDegrees - Radius of the cone in degrees
 * @param {CatalogOptions} [options] - Additional configuration options for the catalogue.
 *
 * @param {function} [successCallback] - The callback function to execute on successful catalog creation.
 * @param {function} [errorCallback] - The callback function to execute on error during catalog creation.
 * @returns {Catalog}
 *
 * @example
 * A.catalogFromSKAORucio('09 55 52.4 +69 40 47', 0.1, {onClick: 'showPopup', shape: 'plus'})
 */
A.catalogFromSKAORucio = function (target, radiusDegrees, options, successCallback, errorCallback) {
    options = options || {};
    if (!('name' in options)) {
        options['name'] = 'SKAO';
    }
    var url = URLBuilder.buildSKAORucioCSURL(target, radiusDegrees);

    return A.catalogFromURL(url, options, successCallback, errorCallback, true);
};

/**
 * Create a catalog from a SKAORucio cone search query
 *
 * @function
 * @memberof A
 * @name A.catalogFromVizieR
 * @param {string} vizCatId - the id of the ViZieR catalog
 * @param {string|Object} target - can be either a string representing a position or an object name, or can be an object with keys 'ra' and 'dec' (values being in decimal degrees)
 * @param {number} target.ra - Right Ascenscion in degrees of the cone's center
 * @param {number} target.dec - Declination in degrees of the cone's center
 * @param {number} radius - Radius of the cone in degrees
 * @param {CatalogOptions} [options] - Additional configuration options for the catalogue.
 *
 * @param {function} [successCallback] - The callback function to execute on successful catalog creation.
 * @param {function} [errorCallback] - The callback function to execute on error during catalog creation.
 * @returns {Catalog}
 *
 * @example
 *      const cat = A.catalogFromVizieR('I/311/hip2', 'M 45', 5, {onClick: 'showTable'});
 */
A.catalogFromVizieR = function (vizCatId, target, radius, options, successCallback, errorCallback) {
    options = options || {};
    if (!('name' in options)) {
        options['name'] = 'VizieR:' + vizCatId;
    }

    var url = URLBuilder.buildVizieRCSURL(vizCatId, target, radius, options);
    return A.catalogFromURL(url, options, successCallback, errorCallback, false);
};

/**
 * Create a catalog from a SkyBot cone search query
 *
 * @function
 * @memberof A
 * @name A.catalogFromSkyBot
 * @param {number} ra - Right Ascenscion in degrees of the cone's center
 * @param {number} dec - Declination in degrees of the cone's center
 * @param {number} radius - Radius of the cone in degrees
 * @param {string} epoch - Requested epoch, expressed in Julian day or ISO dateTime
 * @param {Object} queryOptions - options passed to SkyBot, see {@link https://vo.imcce.fr/webservices/skybot/?conesearch}
 * @param {CatalogOptions} [options] - Additional configuration options for the catalogue.
 * @param {function} [successCallback] - The callback function to execute on successful catalog creation.
 * @param {function} [errorCallback] - The callback function to execute on error during catalog creation.
 * @returns {Catalog}
 */
A.catalogFromSkyBot = function (ra, dec, radius, epoch, queryOptions, options, successCallback, errorCallback) {
    queryOptions = queryOptions || {};
    options = options || {};
    if (!('name' in options)) {
        options['name'] = 'SkyBot';
    }
    var url = URLBuilder.buildSkyBotCSURL(ra, dec, radius, epoch, queryOptions);
    return A.catalogFromURL(url, options, successCallback, errorCallback, false);
};

/**
 * Creates a user interface button for Aladin Lite
 *
 * @function
 * @memberof A
 * @name button
 *
 * @param {Object} options - Options for configuring the button.
 * @param {boolean} [options.toggled=false] - Whether the button is initially toggled.
 * @param {function} [options.action] - The callback function to execute when the button is clicked.
 * @param {string} [options.title] - The title attribute for the button.
 * @param {Object} [options.icon] - An icon object for the button.
 * @param {boolean} [options.disable=false] - Whether the button is initially disabled.
 * @param {HTMLElement|string|Widget} [options.content] - The content to be added to the button.
 * @param {CSSStyleSheet} [options.cssStyle] - The CSS styles to apply to the button.
 * @param {Object} [options.tooltip] - A tooltip.
 * @param {Object|string} [options.position] - The position of the button.
 * @param {string} [options.size] - The size of the button. Can be 'medium' or 'small'
 * @returns {ActionButton} Returns a new button object representing the graphic overlay.
 *
 * @example
 *       let btn = A.button({
 *           content: 'Draw your coverage',
 *           cssStyle: {
 *               backgroundColor: 'pink',
 *           },
 *           tooltip: {cssStyle: {color: 'red'}, content: 'Create a moc in pink!', position: {direction: 'top'}},
 *           action(o) {
 *               // Enter a polygonal selection mode
 *               aladin.select('poly', p => {
 *                   // Create a moc from the polygon
 *                   try {
 *                       let ra = []
 *                       let dec = []
 *                       for (const v of p.vertices) {
 *                           let [lon, lat] = aladin.pix2world(v.x, v.y);
 *                           ra.push(lon)
 *                           dec.push(lat)
 *                       }
 *
 *                       let moc = A.MOCFromPolygon(
 *                           {ra, dec},
 *                           {name: 'poly', lineWidth: 3.0, color: 'pink'},
 *                       );
 *                       aladin.addMOC(moc)
 *                   } catch(_) {
 *                       alert('Selection covers a region out of the projection definition domain.');
 *                  }
 *              })
 *          }
 *       });
 *       aladin.addUI(btn)
 */
A.button = function(options) {
    return new ActionButton(options);
}

/**
 * Creates a box user interface for Aladin Lite.
 *
 * @function
 * @memberof A
 * @name box
 *
 * @param {Object} options - Options for configuring the button.
 * @param {Object} [options.header] - The header of the box
 * @param {boolean} [options.header.draggable=false] - Can move the window by dragging its title. 
 * @param {string} [options.header.title] - A title name for the window
 * @param {HTMLElement|string|Widget} [options.content] - The content to be added to the button.
 * @param {CSSStyleSheet} [options.cssStyle] - The CSS styles to apply to the button.
 * @param {Object|string} [options.position] - The position of the button.
 * @returns {Box} Returns a new box window object.
 *
 * @example
 *   let box = A.box({
 *       header: {
 *           title: "My window",
 *           draggable: true,
 *       },
 *       content: "This is the content of my window<br/> I can write proper html",
 *       position: {
 *           anchor: 'center center'
 *       }
 *   })
 *   aladin.addUI(box)
 */
A.box = function(options) {
    return new Box(options)
}

A.getAvailableListOfColormaps = function() {
    return ColorCfg.COLORMAPS;
};

/**
 * Initializes the Aladin Lite library, checking for WebGL2 support.
 * This method must be called before instancing an Aladin Lite object.
 *
 * @function
 * @name A.init
 * @memberof A
 * @async
 *
 * @throws {string} Throws an error if WebGL2 is not supported by the browser.
 *
 * @returns {Promise<void>} A promise that resolves once the initialization is complete.
 *
 * @example
 * // Usage example:
 * A.init
 *   .then(async () => {
 *     const aladinInstance = A.aladin('div', requestedOptions);
 *     // Perform further actions with the Aladin Lite instance
 *   })
 *   .catch(error => {
 *     console.error('Error initializing Aladin Lite:', error);
 *   });
 */
A.init = (async () => {
    const isWebGL2Supported = document
        .createElement('canvas')
        .getContext('webgl2');

    await init();
    // Check for webgl2 support
    if (isWebGL2Supported) {
        Aladin.wasmLibs.core = module;
    } else {
        // WebGL1 not supported
        // According to caniuse, https://caniuse.com/webgl2, webgl2 is supported by 89% of users
        throw "WebGL2 not supported by your browser";
    }
})();

export default A;
