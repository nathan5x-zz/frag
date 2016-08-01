
(function(document){
	
	'use strict';

	function getRootApp(name){
		
		var root = document.querySelectorAll('[ow-app='+name+']');
		if(root.length == 0){ throw Error(name + ' not found ...');	}

		function getControllers() {
			return root[0].querySelectorAll('[ow-controller]');
		}

		var exports = {};
		exports.app = root;
		exports.getControllers = getControllers;

		return exports;
	}

	var OneWay = function(name){
		
		var name = name,
			controllers = [],
			exports = {};

			var appContext = getRootApp(name),
				controllers = appContext.getControllers();

			function bindController(name, controller) {
				var ctx = {},
					element = getElement(name);

				if(element == undefined){ return; }
				new controller(ctx);
				renderTemplate(ctx, element)
			}

			function getElement(name) {
				for(var i=0; i<controllers.length; i++) {
					if(controllers[i].attributes[0].nodeValue == name) {
						return controllers[i];
					}
				}
			}

			function renderTemplate(ctx, element) {
				var html = element.innerHTML;
				element.innerHTML = attachTemplateToData(html, ctx);
			}

		   function attachTemplateToData(template, data) {

	            var t, key, reg;

	            for (key in data) {
	                reg = new RegExp('{{' + key + '}}', 'ig');
	                t = (t || template).replace(reg, data[key]);
	            }
	 
	            return t;
		    };

			exports.registerController = function(name, controller) {
				bindController(name, controller);
				return this;
			}

		return exports;
	}

	window.OneWay = OneWay;

})(window.document)
