#AppCore.js 0.0.2

##Events
###$.publish() - method

Public High-level Method to broadcast the message to all subscribers.

Method takes a string as a parameter and it represents a topic id of event.
publish() has no limitations to the number of parameters sent to the subscriber's eventHandler function.
Example with parameters

publish( topic: string, arg1, arg2, arg3, ...)

    publish( topic: string, arg1, arg2, arg3, ...)

topic 	- is a string representation of event.
arg1...n 	- can be any type. Unlimited number of arguments.
Returns: void

###$.publish(object) - method

Public High-level Method to broadcast the message to all subscribers.

Method takes one parameter which is an object with some configuration parameters.
publish() has no limitations to the number of parameters sent to the subscriber's eventHandler function.
Example with parameters

publish( {topic: string, system: bool, module: bool}, arg 1, arg2, arg3, ...)

    publish( {topic: string, system: bool, module: bool}, arg 1, arg2, arg3, ...)

object 	- {topic: string, system: bool, module: bool}.

topic is a string representation of event.

system defines whether system events should be included into broadcast. This is handy parameter for inter-module event pub/sub communication. Default is true.

module defines whether or not module events should be included into broadcast. If set to false, can be used for system events of the core Application. This is really handy option for creating/extending the main application with internal system modules/events. All inner working of the framework use module = false for internal communication.
arg1...n 	- can be any type. Unlimited number of arguments.
Returns: void

###$.subscribe() - method

API High-level Method to subscribe to the event.
Topic and eventHandler are two required parameters

subscribe() can pass none, single or multiple parameters to eventHandler.
Example with parameters

subscribe( topic: string, eventHandler: function())
subscribe( topic: string, eventHandler: function(param))
subscribe( topic: string, eventHandler: function(param1, param2, ...))

    subscribe( topic: string, eventHandler: function(param1, param2, ...))

topic 	- string representation of topic id
eventHandler 	- functions that handles event when topic is published
Returns: object

        - object {topic: string, uid: string, system: bool} or false. Returning false from the event handler will prevent any additional subscriptions from being invoked and will cause publish() to return false. 

###$.subscribe() - method

API High-level Method to subscribe to the event.

Topic and eventHandler are two required parameters, options object is optional:
subscribe() can pass none, single or multiple parameters to eventHandler.
Example with parameters

subscribe( topic: string, eventHandler: function(param1, param2, ...), options: {context: this, priority: 10, system: false, data: object{key:value} })

    subscribe( topic: string, eventHandler: function(param1, param2, ...), options: {context: this, priority: 10, system: false, data: object{key:value} })

topic 	- string representation of topic id
eventHandler 	- functions that handles event when topic is published
options 	- {context: null, priority: int, system: bool}

context: The value of "this" when the event handler is called. Often there is a need to operate within a context for a subscription callback. It can be a reasonable strategy to have the context be set to a jQuery object that will be used inside of the subscription, or even a native DOM element. Default is module instance.

priority: Priority relative to other subscriptions for the same message. Lower values have higher priority. Subscribing to a topic with high priority can be useful as an error handler or anytime data may need to be checked or augmented before proceeding. Default is 10.

system: Defines if it is system event or not. All internal events of the framework have system event set to true. All module events have system set to false. It' is useful for separation of module and system eventing and is done to prevent unsubscribe() method used trough module API from unsubscribing essential system events from global event stack. By the same time, if system module is created this must be set to true. Only system module can unsubscribe system events. Default is false.

data: This parameter sends additional key-value object to the event. This can be used as a static unmodifiable configuration data structure. An example for usa case would be when event is created inside of the module, module creates static field '_module_' : module name', which is used for module look up, when only id of the subscription is known.
Returns: object

        - object {topic: string, uid: string, system: bool} or false. Returning false from the event handler will prevent any additional subscriptions from being invoked and will cause publish() to return false. 

###$.unsubscribe() - method

Public High-level Method to unsubscribe from the event.

Topic and uid are two required parameters.
Third parameter "system" is optional and used to remove system events. Default is false.

Removes all events from module. Useful when destroying module.

    unsubscribe( )

Removes all events from module. Useful when destroying module.

    unsubscribe( module: string)

Module will be assigned automatically, based on the module called from

    unsubscribe( topic: string)

Removes specific event from specific module.

    unsubscribe( module: string, topic: string)

Takes an event object returned from subscribe() function.

    unsubscribe( {topic: string, uid: string, system: bool})

Takes an event object returned from subscribe() function with less parameters.

    unsubscribe( {topic: string, uid: string} )

Takes an array of event objects from subscribe() function.

    unsubscribe( Array: [
    {topic: string, uid: string, system: bool},
    {topic: string, uid: string, system: bool},
    {topic: string, uid: string, system: bool}
    ] )
    //or
    unsubscribe( Array: [
    {topic: string, uid: string},
    {topic: string, uid: string},
    {topic: string, uid: string}
    ] )

Takes an array of module strings.

    unsubscribe( Array: [
    module: string,
    module: string,
    module: string
    ] )

Takes an array of topic strings.

    unsubscribe( Array: [
    topic: string,
    topic: string,
    topic: string
    ] )

    unsubscribe( )
    unsubscribe( module: string)
    unsubscribe( topic: string)
    unsubscribe( topic: string)
    unsubscribe( module: string, topic: string)
    unsubscribe( {topic: string, uid: string, system: bool})
    unsubscribe( {topic: string, uid: string} )
    unsubscribe( Array: [
    {topic: string, uid: string, system: bool},
    {topic: string, uid: string, system: bool},
    {topic: string, uid: string, system: bool}
    ] )
    unsubscribe( Array: [
    {topic: string, uid: string},
    {topic: string, uid: string},
    {topic: string, uid: string}
    ] )
    unsubscribe( Array: [
    module: string,
    module: string,
    module: string
    ] )
    unsubscribe( Array: [
    topic: string,
    topic: string,
    topic: string
    ] )

topic 	- string representation of topic id
eventHandler 	- functions that handles event when topic is published
Returns: object

        - object {topic: string, uid: string, system: bool} or false. Returning false from the event handler will prevent any additional subscriptions from being invoked and will cause publish() to return false. 

###AppCore.publish() - method

Public Low-level Method to broadcast the message to all subscribers.

Method takes one parameter, which can be either a string representation of event or an object with some configuration parameters.
Configuration parameters are:

    {topic: string, system: bool, module: bool}

publish() has no limitations to the number of arguments sent to the subscriber's eventHandler function.

    AppCore.publish( topic: string, arg1, arg2, arg3, ...);
    //or
    AppCore.publish( {topic: string, system: bool, module: bool}, arg1, arg2, arg3, ...);

topic. 	- Name of the event.
topic. 	- {topic: string, system: bool, module: bool} - Configuration object of the event.

topic: is a string representation of event.

system: defines whether system events subscribed to this topic should be notified. This is handy parameter for inter-module event pub/sub communication. Default is true.

module: defines whether or not module events subscribed to the topic should be notified. If set to false, can be used for system events of the core Application. This is really handy option for creating/extending the main application with internal system events. All inner working of the framework use module = false for internal communication.
arg0...n. 	- Any Number of arguments can be supplied to the method.
Returns: boolean

###AppCore.subscribe() - method

Public Low-level Method to subscribe to the event.

subscribe() can pass none, single or multiple parameters to event handler.

NOTE: Returning false from the event handler will prevent any additional subscriptions from being invoked and will cause publish() to return false.

    AppCore.subscribe( topic: string, eventHandler: function(param))
    //or
    AppCore.subscribe( topic: string, eventHandler: function(param1, param2, ...))
    //or
    AppCore.subscribe( topic: string, eventHandler: function(param1, param2, ...), options: {context: null, priority: 10, system: true, data: object{key: value} } )

topic. 	- Name of the event.
eventHandler. 	- Body of the event - executes when event is triggered.
options. 	- {context: null, priority: 10, system: true, data: object} - Topic and eventHandler are two required parameters, options object is optional

context: The value of "this" when the event handler is called. Often there is a need to operate within a context for a subscription callback. It can be a reasonable strategy to have the context be set to a jQuery object that will be used inside of the subscription, or even a native DOM element.

priority: Priority relative to other subscriptions for the same message. Lower values have higher priority. Default is 10. Subscribing to a topic with high priority can be useful as an error handler or anytime data may need to be checked or augmented before proceeding.

system: Defines if it is system event or not. All internal events of the framework have system event set to true. All module events have system set to false. It' is useful for separation of module and system eventing and is done to prevent unsubscribe() method used trough module API from unsubscribing essential system events from global event stack. By the same time, if system module is created this must be set to true. Only system module can unsubscribe system events. Default is true.

data: This parameter sends additional key-value object to the event. This can be used as a static unmodifiable configuration data structure. An example for use case would be when event is created inside of the module, module creates static field '_module_' : module name', which is used for module look up, when only id of the subscription is known.
Returns: object

        - {topic: string, uid: string, system: bool}. 

###AppCore.unsubscribe() - method

Public Low-level Method to unsubscribe from the event.

    AppCore.unsubscribe( topic: string, uid: string)
    //or
    AppCore.unsubscribe( topic: string, uid: string, system: bool )
    //or
    AppCore.unsubscribe( Array: [
    {topic: string, uid: string, system: bool},
    {topic: string, uid: string, system: bool},
    {topic: string, uid: string, system: bool}
    ] )

topic. 	- Required parameter.
uid. 	- Required parameter.
system. 	- Optional. Used to control the removal of system events. Default is true.
Returns: boolean

        - Returns true if events were usubscribed, false if there was an error. 

##Utils
###$.inArray() - method

Shorthand method to check if element is in array

    $.inArray(elem, array)

elem 	- any type to look for
array 	- an array to be searched
Returns: boolean

###AppCore.isArray(any) - method

Cross-browser check whether variable is an Array.

    AppCore.isArray(any)

array. 	- Any variable can be passed into function for array check.
Returns: boolean

        - Returns true if passed variable is array, false if it's not. 

###AppCore.inArray( elem, array ) - method

Global method to check if element is in array.

    AppCore.inArray( elem, array )

elem 	- any type to look for .
Array 	- an array to be searched .
Returns: integer

        - Returns index of found value in array. Returns -1 if nothing was found. 

###AppCore.toArray() - method

Converts function arguments into Array. Useful when using apply().

    AppCore.toArray( arguments )

arguments 	- passed to the function.
Returns: array

        - array of arguments. 

###AppCore.isFunction() - method

Check if passed parameter is a function.

Note: DOM methods and functions like alert aren't supported. They return false on IE.

    AppCore.isFunction( obj )

obj 	- any type can be used.
Returns: boolean

        - True if object is a function, false if it is not. 

###AppCore.isWindow() - method

Check if passed object is a window.

    AppCore.isWindow( obj )

obj 	- any type can be used.
Returns: boolean

        - True if object is a Window, false if it is not. 

###AppCore.isNumeric() - method

Check if passed object is of a numeric value.

    AppCore.isNumeric( obj )

obj 	- any type can be used.
Returns: boolean

        - True if object is a is numeric, false if it is not. 

###AppCore.type() - method

Get type of any variable in string format.

    AppCore.type( obj )

obj 	- any type can be used.
Returns: string

        - string representation of any variable. 

###AppCore.isPlainObject() - method

Check to see if an object is a plain object (created using "{}" or "new Object") and not native DOM or Window object.

    AppCore.isPlainObject( obj )

The 	- object that will be checked to see if it's a plain object.
Returns: boolean

        - true if plain object, otherwise false. 

###AppCore.isEmptyObject() - method

Check to see if an object is empty (contains no properties === {}). The supplied object must be a plain object.

    AppCore.isEmptyObject( obj )

The 	- object that will be checked to see if it's a empty object.
Returns: boolean

        - true if empty object, otherwise false. 

###AppCore.isTouch - variable

Checks for touch devices.

    AppCore.isTouch

Returns: boolean

        - true if is touch device, otherwise false. 

###AppCore.is3DSupported - variable

Checks for CSS3 3D support.

    AppCore.is3DSupported

Returns: boolean

        - true if 3d is supported, otherwise false. 

###AppCore.removeDuplicates() - method

Remove duplicates from an array.

    AppCore.removeDuplicates(array)

The 	- array from which all duplicates should be removed.
Returns: array

        - new array without duplicates. 

###AppCore.trim() - method

Removes whitespace from both ends of the string.

    AppCore.trim(string)

string 	- to be trimmed on both sides.
Returns: string

        - trimmed string. 

###AppCore.keys() - method

Returns an array of keys for the object. If `attributes_only` is true will not return keys that map to a `function()`

    AppCore.keys(attributes_only)

attributes_only 	- if true will not return keys that map to a `function()`.
Returns: array

        - Array of keys. 

###AppCore.has() - method

Checks if the object has a value at `key` and that the value is not empty

    AppCore.has(key)

key 	- that should be checked.
Returns: array

        - Array of keys. 

###AppCore.join() - method

Convenience method to join as many arguments as you want by the first argument - useful for making paths

    AppCore.join(delimiter, arg1, arg_n)

first 	- argument should be a string delimiter the rest is a list of objects to join by delimiter. Method can take unlimited number of arguments.
Returns: string

        - string of joined arguments. 

###AppCore.unique() - method

Generates unique number.

Method uses internal counter which makes every generated number genuinely unique. Useful for generating unique guid.

    AppCore.unique()

Returns: integer

        - unique integer. 

###AppCore.random() - method

Generates random numbers and strings.

Even though generated output consist of random characters and numbers, there is no internal tracker in that method and large array of generated elements has a chance of double entries.

    AppCore.random(type, length)

type. 	- There are 5 types of random generated output: 'string', 'int','uppercase', 'lowercase', 'letters'. Default is 'string'.
length 	- of generated output. How many random characters to generate. Default is 8.
Returns: string

        - string of random characters. 

###AppCore.typeOf() - method

Get type of any variable in string format. Same as .type(), but this method can distinguish between 'global', 'document' and 'dom' objects. It does more comprehensive checks for the cost of performance.

    AppCore.typeOf( obj )

obj 	- any type can be used.
Returns: string

        - string representation of any variable. 

##App Config
###$.config - object

Get the global static AppCore config object

    $.config

Returns: object

        - config 

###AppCore.config() - method

Add new app-config object.

This is shared object available between all modules and events in the app. Even though config can be extended at any time, this is strongly discouraged. Best practices dictate that commonly shared object must be declared constant and any data interaction/modification should be and can be achieved through event message passing. Such approach will help to avoid any possible race conditions and stuff that is generally hard to debug.

This method creates static, non-mutable object, which is declared right after AppCore autostart but before creation of any AppCore.module(s).

    AppCore.config() // gets config.
    AppCore.config({speed: 800}) // returns new config after extension.

new_config 	- js Object. Default false.
Returns: object

        - config 

##Routing
###$.hashchange() - method

Shorthand method to subscribe to hashchange event

    $.hashchange(handler)

handler 	- function that gets fired when url hash part changes
Returns: void

##Module
###$.getName() - method

Get the name of the defined module within the module context

    $.getName()

Returns: string

        - moduleName 

###$.getEngineName() - method

Get the name of the defined selector engine

    $.getEngineName()

Returns: string

        - selectorEngine 

###$.getCore() - method

Get the reference to the AppCore

    $.getCore()

Returns: object

        - AppCore 

###$.getContainer() - method

Get the reference to the DOM Collection of the module.

Must be set prior with setContainer. When module is created Core searches module name amongst DOM elements. If it finds DOM element with exact name it will set the binding between module and DOM element otherwise it keeps it undefined and can be set latter with setContainer() if needed.

    $.getContainer()

Returns: object

        - domObject 

###$.setContainer() - method

Bind Dom elements to the module. Creates Dom association with the module. This method helps to associate DOM object with the module. Normally you would make a DOM element called for example #shoppingCart and associate it with module "shoppingCart". The module "shoppingCart" becomes responsible for any functionality associated with of DOM representation.

    $.setContainer()

new_Container 	- by default it uses querySelectorAll, or if jQuery is present on the page it will use it by default. In any case css type selectors are supported.
Returns: object

        - domObject 

##Console
###$.console - object

Log the message to the console from the module.

Due to diffident implementations of console in Firefox and Webkit browsers, line numbers are getting messed up in Webkits, but correct in Firefox. Webkits use proto for all methods, this is the reason why they cannot be reassigned to Api variables and should be used via apply. @param message string;

    $.log(object[, object, ...])
    $.info(object[, object, ...])
    $.warn(object[, object, ...])
    $.error(object[, object, ...])
    $.group(object[, object, ...])
    $.groupEnd()

object 	- or string to log to browser console.
Returns: void

##Debug
###AppCore.debug() - method

Enable/Disable debug mode. Default false.

    AppCore.debug(on);

on 	-
Returns: void

###AppCore.checkEvents() - method

Public Low-level Method useful for debugging. Available only if debug mode is turned on.

    AppCore.checkEvents()

Returns: consoleObject

        - Prints values of important system variables to console. 

##System
###AppCore.setSelectorEngine() - method

Set selector engine in the AppCore.

jQuery, Zepto or any other selector engines can be used. Simply pass the reference to the desired Selector engine and it becomes available in All modules through api. If jQuery is present on the page it is automatically selected as default selector Engine. Only one selector engine can be specified / active at the time.

    AppCore.setSelectorEngine('jquery', jQuery);

name 	- name reference, which is used across the application. For jQuery use 'jquery'.
engine 	- reference to selector engine. Default jQuery.
Returns: void

###AppCore.isRunning() - method

Check to see if module/page is currently running.

    AppCore.isRunning('name');

pageID/moduleID 	- string. Name of the page/module.
Returns: boolean

##Extend
###AppCore.extendApi() - method

Extends Facade Api available in the module.

This method should be used to add new methods and properties to the Api. Api is passed to the module as a first argument e.g AppCore.module("module_name", function(Api) {}). Default Api consist of small but essential set of features, just enough to get started on the new big thing. Due to the fact that each and every project is individual, this Api should be adjusted and extended on per project bases. Api itself is created in modular way and can be copied across to the new project.

    //1. set selector engine:
    AppCore.setSelectorEngine('jquery', jQuery);
    //Note: jQuery is default selector engine. If jQuery is included in the page, it will be set as default selector engine automatically and this step can be skipped.
    //2. Extend the Api:
    AppCore.extendApi({
    find : function (selector) {
    return this.getContainer().find(selector);
    }
    }, 'jquery');

new_object 	- - Api object that should be added to the api.
dependency 	- string. Optional. Used in conjunction with selector engine. If api methods depend on specific selector engine, dependency should be specified to the name of that engine. It helps to protect the code from possible errors. Errors occur when new methods of the api try to access some functionality of non-specified / non-registered selector engine. If dependency is specified it will check if it's active and only then extend the Api. If dependency does not match the selector engine, the Api will not be extended with the newly declared methods.
Returns: void

###AppCore.extend() - method

Extends AppCore . This method should be used to add new methods and properties to the AppCore.

    AppCore.extend({
    find : function (selector) {
    return this.getContainer().find(selector);
    }
    });

new_object 	- Api object that should be added to the core AppCore.
Returns: void

##App Page
###AppCore.page() - method

Register AppCore page. To start the page see startPage(page_name);

    AppCore.page('pageID', function($){
    var pageVariable;
    init: function(){},
    pageLoad : function(){},
    pageReady : function(){},
    beforeDestroy : function(){},
    destroy : function () {}
    })

pageID 	- string. Name of the page. Used to start or stop the page.
creator 	- function. Page executable.
Returns: void

###AppCore.close() - method

Shorthand method to close particular page. Same as AppCore.publish(pageID+':close');

    AppCore.close('pageID');

pageID 	- string. Name of the page.
Returns: void

###AppCore.startPage() - method

Start registered AppCore page.

    AppCore.startPage('pageID', {key : value});

pageID 	- string. Name of the page. Used to start or stop the page.
data 	- Key/Value dictionary passed to the page when it is started. To access that dictionary inside of the page use $.data
Returns: void

###AppCore.stopPage() - method

Stop running AppCore page.

    AppCore.stopPage('pageID');

pageID. 	- Name of the page. Used to start or stop the page.
Returns: void

##App Module
###AppCore.module() - method

Register AppCore module. To start the module see startModule(module_name);

    AppCore.module('moduleID', function($){
    var moduleVariable;
    init: function(){},
    destroy : function () {}
    })

moduleID 	- string. Name of the module. Used to start or stop the module.
creator 	- function. Module executable.
Returns: void

###AppCore.startModule() - method

Start registered AppCore module.

    AppCore.startModule('moduleID', {key : value});

moduleID. 	- Name of the module. Used to start or stop the module.
data 	- Key/Value dictionary passed to the page when it is started. To access that dictionary inside of the page use $.data
Returns: void

###AppCore.startAllModules() - method

Start all registered AppCore module.

    AppCore.startAllModules();

Returns: void

###AppCore.stopModule() - method

Stop running AppCore module.

    AppCore.stopModule('moduleID');

moduleID. 	- Name of the module. Used to start or stop the module.
Returns: void

###AppCore.stopAllModules() - method

Stops all running AppCore modules.

    AppCore.stopAllModules();

Returns: void

Generated by Dokki.js

