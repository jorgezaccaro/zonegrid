/* GLOBAL VARIABLES */
var middle = 'middle', scopeout = 'scopeout';

/** MODULE INTERFACE
 *@method {function} handle - Handles element quadrant changes and border crossings
 */
module.exports = {
    handle: handleCrossings
};

/*----------------------------------------------------------------------------*/

/** Handles quadrant changes and border crossings of moving elements
 * @param {object} zone - The zone where elements are changing quadrants and crossing borders
 * @param {object} change - Describes the quadrant change
 */
function handleCrossings(zone, change) {
    var elementID = change.id,
        element = zone.elements[elementID],
        quadrant = change.quadrant, // e.g. {x: 'lower.scopein', y: 'higher.bookin', z: 'middle'}
        lastQuadrant = change.lastQuadrant,
        x = quadrant.x.split('.'),  
        y = quadrant.y.split('.'),  
        z = quadrant.z.split('.'),
        bands = {
            x: x[0],    // e.g. 'lower'
            y: y[0],    // e.g. 'higher'
            z: z[0]     // e.g. 'middle'
        },
        margins = {
            x: x[1],    // e.g. 'scopein'
            y: y[1],    // e.g. 'bookin'
            z: z[1]     // e.g. undefined
        }; 
        console.log(element.position.x, element.position.y, quadrant);

    x = lastQuadrant.x.split('.');  
    y = lastQuadrant.y.split('.');  
    z = lastQuadrant.z.split('.');
    var lastBands = {
            x: x[0],    // e.g. 'lower'
            y: y[0],    // e.g. 'higher'
            z: z[0]     // e.g. 'middle'
        },
        lastMargins = {
            x: x[1],    // e.g. 'scopein'
            y: y[1],    // e.g. 'bookin'
            z: z[1]     // e.g. undefined
        };;
    
    // Figure out which neighbors should receive the quadrant change notification
    var neighbors = getInvolvedNeighbors(bands, margins, lastBands, lastMargins);

    // Loop through all neighbors and notify the margin crossing 
    for (var index in neighbors) {
        var neighborSides = index.split('-'),
            jampNotification;

        neighborSides = {
            x: neighborSides[0].split('.')[1],
            y: neighborSides[1].split('.')[1],
            z: neighborSides[2].split('.')[1]
        };

        var neighbor = zone.neighbors('x.' + neighborSides.x, 'y.' + neighborSides.y, 'z.' + neighborSides.z); 
        if (!neighbor || !neighbor.server) { continue; }


        // Cube vertices (x8): all bands different than middle
        if (bands.x !== middle && bands.y !== middle && bands.z !== middle) {
            // Cube vertix neighbor (x1)
            if (neighborSides.x === neighborSides.y &&
                neighborSides.y === neighborSides.z &&
                neighborSides.x === neighborSides.z) {
                
            }
            // 
        }
        // Cube borders (x12): two bands different than middle
        else if (bands.x !== middle && bands.y !== middle ||
                 bands.y !== middle && bands.z !== middle ||
                 bands.x !== middle && bands.z !== middle) {
            for (var coordinate in notMiddleCoordinates(bands)) {
                var jampMargin = margins[coordinate];
                if (neighborSides[coordinate] === bands[coordinate] && 
                    validMargin(zone, neighbor, elementID, jampMargin)) {
                    sendNotification(zone, neighbor, element, jampMargin);
                    break;
                }
            }    
        } 
        // Cube faces (x6): one band different than middle
        else if (bands.x !== middle || bands.y !== middle || bands.z !== middle) {
            // Scopeout
            for (var coordinate in notMiddleCoordinates(lastBands)) {
                if (neighborSides[coordinate] === lastBands[coordinate] && 
                    lastBands[coordinate] !== bands[coordinate]) {
                    sendNotification(zone, neighbor, element, 'scopeout');
                    break;
                }
            }
            // Bookin and checkin
            for (var coordinate in notMiddleCoordinates(neighborSides)) {
                var jampMargin = margins[coordinate];
                if (validMargin(zone, neighbor, elementID, jampMargin, neighborSides, bands)) { 
                    sendNotification(zone, neighbor, element, jampMargin);
                    console.log(neighbor.side, jampMargin)
                    // break; // once the cube face coordinate is found, the loop can be broken
                }
            }
        }
        // Cube core (x1): all bands are equal to middle
        else {
            // Scopeout
            for (var coordinate in notMiddleCoordinates(neighborSides)) {
                if (lastBands[coordinate] !== middle && neighborSides[coordinate] === lastBands[coordinate]) {
                    sendNotification(zone, neighbor, element, 'scopeout');
                }
            }
        }
    }
}

function validMargin(zone, neighbor, elementID, margin, neighborSides, bands) {
    if (zone[margin] && typeof zone[margin][elementID] !== 'object') {
        zone[margin][elementID] = {};
    }
    if (neighborSides && bands &&
        !(neighborSides.x === bands.x && neighborSides.y === bands.y && neighborSides.z === bands.z)) {
        return false;
    }
    return margin && zone[margin] && neighbor[margin] && !neighbor[margin][elementID];
}

function sendNotification(zone, neighbor, element, margin) {
    var event = margin,
        elementID = element.id,
        position = element.position || {},
        message = {
            element: {
                id: element.id,
                position: {
                    x: position.x,
                    y: position.y,
                    z: position.z
                }
            }
        };

    if (margin === 'scopeout') {
        if (zone['scopein'][elementID]) {
            delete zone['scopein'][elementID][neighbor.side];
            delete neighbor['scopein'][elementID];
        }
        if (zone['bookin'][elementID]) {
            delete zone['bookin'][elementID][neighbor.side];
            delete neighbor['bookin'][elementID];
        }
    } else {
        zone[margin][elementID][neighbor.side] = true;
        neighbor[margin][elementID] = element;
        if (margin === 'bookin' && (!neighbor['scopein'][elementID] ||
            zone['scopein'] && !zone['scopein'][elementID][neighbor.side])) {
            event = margin = 'scopein';
            zone['scopein'][elementID][neighbor.side] = true;
            neighbor['scopein'][elementID] = element;
            process.nextTick(function () {
                sendNotification(zone, neighbor, element, 'bookin');
            });
        } 
        if (margin === 'scopein') {
            var jampAssets = zone.servers.jampAssets;
            message.request = {
                hostname: jampAssets.host,
                port:     jampAssets.port,
                path:     '/' + element.file
            };
            message.element.file = element.file;
        }
    }

    neighbor.emit(event, message);
}

function middleCoordinates(sides) {
    var axes = {};
    for (var coordinate in sides) {
        if (sides[coordinate] === middle) {
            axes[coordinate] = true;
        }
    }
    return axes;
}

function notMiddleCoordinates(sides) {
    var axes = {};
    for (var coordinate in sides) {
        if (sides[coordinate] !== middle) {
            axes[coordinate] = true;
        }
    }
    return axes;
}

/** Finds the neighbors interested in receiving the notification of a quadrant change
 * @param {object} sides - Indicates the position of a quadrant relative to the zone
 * @param {object} margins - Indicates the margins crossed in each coordinate axis
 * @returns {object} neighbors - A set of the neighbors interested in the events of a given quadrant
 */
function getInvolvedNeighbors(sides, margins, lastSides, lastMargins) {
    var neighbors = {},
        lower = 'lower',
        middle = 'middle',
        higher = 'higher';

    // Add the neighbor associated directly with this quadrant
    neighbors['x.' + sides.x +'-'+ 'y.' + sides.y +'-'+ 'z.' + sides.z] = margins;

    // X axis
    if (sides.x === middle && sides.x !== lastSides.x) {
        neighbors['x.' + lastSides.x +'-'+ 'y.' + sides.y +'-'+ 'z.' + sides.z] = margins;
        neighbors['x.' + lastSides.x +'-'+ 'y.' + middle  +'-'+ 'z.' + sides.z] = margins;
        neighbors['x.' + lastSides.x +'-'+ 'y.' + sides.y +'-'+ 'z.' + middle] = margins;
        neighbors['x.' + lastSides.x +'-'+ 'y.' + middle  +'-'+ 'z.' + middle] = margins;
    }
    // Y axis
    if (sides.y === middle && sides.y !== lastSides.y) {
        neighbors['x.' + sides.x +'-'+ 'y.' + lastSides.y +'-'+ 'z.' + sides.z] = margins;
        neighbors['x.' + middle  +'-'+ 'y.' + lastSides.y +'-'+ 'z.' + sides.z] = margins;
        neighbors['x.' + sides.x +'-'+ 'y.' + lastSides.y +'-'+ 'z.' + middle] = margins;
        neighbors['x.' + middle  +'-'+ 'y.' + lastSides.y +'-'+ 'z.' + middle] = margins;
    } 
    // Z axis
    if (sides.z === middle && sides.z !== lastSides.z) {
        neighbors['x.' + sides.x +'-'+ 'y.' + sides.y +'-'+ 'z.' + lastSides.z] = margins;
        neighbors['x.' + middle  +'-'+ 'y.' + sides.y +'-'+ 'z.' + lastSides.z] = margins;
        neighbors['x.' + sides.x +'-'+ 'y.' + middle  +'-'+ 'z.' + lastSides.z] = margins;
        neighbors['x.' + middle  +'-'+ 'y.' + middle  +'-'+ 'z.' + lastSides.z] = margins;
    }

    // Add the neighbors that are next to this quadrant
    // XY plane
    if ((sides.x === 'lower' || sides.x === 'higher') && (sides.y === 'lower' || sides.y === 'higher')) {
        neighbors['x.' + middle +'-'+ 'y.' + sides.y +'-'+ 'z.' + sides.z] = margins;
        neighbors['x.' + sides.x +'-'+ 'y.' + middle +'-'+ 'z.' + sides.z] = margins;
    } 
    // YZ plane
    if ((sides.y === 'lower' || sides.y === 'higher') && (sides.z === 'lower' || sides.z === 'higher')) {
        neighbors['x.' + sides.x +'-'+ 'y.' + middle +'-'+ 'z.' + sides.z] = margins;
        neighbors['x.' + sides.x +'-'+ 'y.' + sides.y +'-'+ 'z.' + middle] = margins;
    }
    // XZ plane
    if ((sides.x === 'lower' || sides.x === 'higher') && (sides.z === 'lower' || sides.z === 'higher')) {
        neighbors['x.' + middle +'-'+ 'y.' + sides.y +'-'+ 'z.' + sides.z] = margins;
        neighbors['x.' + sides.x +'-'+ 'y.' + sides.y +'-'+ 'z.' + middle] = margins;
    }

    return neighbors;
}