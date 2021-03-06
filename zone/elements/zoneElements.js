/** MODULE INTERFACE
 *@method {function} - 
 */
module.exports = {
    createContainer: createContainer
};

/*----------------------------------------------------------------------------*/

/** Creates a container object for the elements of a zone
 * @param
 * @returns
 */
function createContainer(zoneEvents, zoneQuadrants) {
    return (function createElementsContainer() {
        var elements = {},
            getMethods = function (container) {
                return {
                    add: { value: addElement.bind(container) },
                    remove: { value: removeElement.bind(container) }
                }
            },
            elementMethods = getMethods(elements);

        Object.defineProperties(elements, elementMethods); 

        return {
            get: function (key) {
                return (typeof key === 'string') ? elements[key] : elements;
            },
            set: function (arrayObject) {
                if (typeof arrayObject === 'object') {
                    elements = arrayObject;
                    Object.defineProperties(elements, getMethods(elements));
                    for (var key in elements) {
                        if (elements.hasOwnProperty(key)) {
                            elements[key] = watchElement(elements[key], key);
                        }
                    }
                    return true;
                }
                return false;
            }
        };
    })();

    function addElement(element) {
        var elements = this,
            elementKey,
            id = element.id,
            name = element.name;

        if (typeof id === 'string' && !elements[id]) {
            elementKey = id;
        } else if (typeof name === 'string' && !elements[name]) {
            elementKey = name;
        }

        if (elementKey) {
            Object.defineProperty(elements, elementKey, {
                enumerable: true,
                writable: true,
                configurable: true,
                value: watchElement(element, elementKey)
            });
            zoneEvents.emit('/elements/add', elements[elementKey]);
        }

        return elementKey;
    }

    function removeElement(id) {
        var elements = this;
        if (typeof elements[id] !== 'object') {
            return false;
        } else {
            delete elements[id];
            zoneEvents.emit('/elements/remove', id);
            return true;
        }
    }

    function watchElement(element, id) {
        var watchedElement,
            position,
            quadrant;

        // Position
        if (typeof element.position === 'object') {
            position = { 
                x: element.position.x || 0,
                y: element.position.y || 0,
                z: element.position.z || 0
            };
        } else {
            position = { x: 0, y: 0, z: 0 }
        }
        // Try to redefine the position property
        position = Object.create({}, { 
            x: changeGetterSetter('number', 'position', 'x', position.x).call(element),
            y: changeGetterSetter('number', 'position', 'y', position.y).call(element),
            z: changeGetterSetter('number', 'position', 'z', position.z).call(element)
        });
        quadrant = zoneQuadrants.which(position);
        try {
            Object.defineProperty(element, 'id', { value: id });
            Object.defineProperty(element, 'position', { value: position });
            Object.defineProperty(element, 'quadrant', { value: quadrant });
            watchedElement = element;
        } catch (e) {
            watchedElement = Object.create(element);
            Object.defineProperty(watchedElement, 'id', { value: id });
            Object.defineProperty(watchedElement, 'position', { value: position });
            Object.defineProperty(watchedElement, 'quadrant', { value: quadrant });
        }

        return watchedElement;
    }

    function changeGetterSetter(typeofProperty, typeofChange, changedProperty, initialValue) {
        return function () {
            var element = this,
                value = initialValue;
                
            return {
                get: function () {
                    return value;
                },
                set: function (newValue) {
                    value = (typeof newValue === typeofProperty) ? newValue : value;
                    zoneEvents.emit('/element/' + typeofChange + 'Change', {
                        element: element,
                        property: changedProperty, 
                        value: value
                    });
                }
            }
        };
    }
}