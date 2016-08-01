/**
 *  _     _           _     _     _      
 * | |__ (_)_ __   __| |___(_) __| | ___ 
 * | '_ \| | '_ \ / _` / __| |/ _` |/ _ \
 * | |_) | | | | | (_| \__ \ | (_| |  __/
 * |_.__/|_|_| |_|\__,_|___/_|\__,_|\___|
 *                                       
 * bindside.js | version 0.0.1
 * (c) Travis Loncar (https://github.com/tbloncar)
 */

var bindside = (function __bindside__() {
  /**
   * Represents a generic value.
   * @class
   */
  function Value(value) {
    this.value = value; 
  }

  Value.prototype.get = function() {
    return this.value;  
  };

  /**
   * Proxy object used to track computed 
   * property dependencies.
   * @class
   *
   * @param {ViewModel} vm - The bindside view model
   */
  function ViewModelProxy(vm) {
    var self = this;

    this.vm = vm; 
    this.propsUsed = [];

    // Mime VM props, injecting dependency tracking
    // into each property function
    for(var p in this.vm.props) {
      /* jshint ignore:start */
      (function(p) {
        self[p] = function() {
          self.propsUsed.push(p);
          return self.vm[p]();
        };
      })(p);
      /* jshint ignore:end */
    }
  }

  /**
   * The bindside view model; used to declare data-bound
   * properties and actions.
   * @class
   *
   * @param {string} selector - A DOM selector used to limit the VM scope
   */
  function ViewModel(selector) {
    var _selector = selector || 'body';

    this.el = document.querySelector(_selector); 
    this.props = {};
    this.propMap = {};
    this.actions = {};
  }

  ViewModel.prototype.prop = function(name, cb) {
    var self = this, vmProxy;

    // Callback present -> computed property
    if(cb) {
      this.props[name] = function() {
        return cb.call(self);
      }; 
    } else {
      this.props[name] = null; 
    }

    // Create VM-level property function
    this[name] = function(value) {
      var val = value === undefined ? undefined : new Value(value);

      if(cb) {
        if(val) {
          throw 'Cannot assign to computed property.'; 
        }

        return this.props[name](); 
      } else {
        if(val) {
          this.props[name] = val.get(); 
          assignValueToNodes(this.getNodesForProp(name), val.get());

          if(this.propMap[name]) {
            this.propMap[name].forEach(function(p) {
              assignValueToNodes(self.getNodesForProp(p), self[p]());
            });
          }
        } else {
          return this.props[name] || '';
        }
      }
    };

    // If property is computed, invoke the callback with
    // a VM proxy object to track property dependencies
    if(cb) {
      vmProxy = new ViewModelProxy(self);
      cb.call(vmProxy); 

      // For each VM property used in the property
      // computation, push the computed property name
      // into its collection of dependent computed properties
      for(var i = 0, l = vmProxy.propsUsed.length; i < l; i++) {
        if(!self.propMap[vmProxy.propsUsed[i]]) {
          self.propMap[vmProxy.propsUsed[i]] = [];
        }

        self.propMap[vmProxy.propsUsed[i]].push(name);
      }
    }
  };

  ViewModel.prototype.action = function(name, cb) {
    var self = this;

    this.actions[name] = function() {
      cb.call(self);
    };
  };

  ViewModel.prototype.model = function(model) {
    this.model = model;

    if(model) {
      for(var k in model) {
        this[k](model[k]);    
      } 
    } else {
      return this.model;  
    }
  };

  ViewModel.prototype.getNodesForProp = function(prop) {
    return this.el.querySelectorAll('[data-bs-prop="' + prop + '"]');
  };

  ViewModel.prototype.getActionBindings = function() {
    var nodes = this.el.querySelectorAll('[data-bs-action]'),
      bindings = [],
      actionArr; 

    for(var i = 0, l = nodes.length; i < l; i++) {
      actionArr = nodes[i].getAttribute('data-bs-action').split('::');

      if(actionArr.length !== 2) {
        throw 'Actions must use the "event::action" syntax.'; 
      }

      bindings.push({
        node: nodes[i],
        event: actionArr[0],
        action: this.actions[actionArr[1]]
      });
    }

    return bindings;
  };

  ViewModel.prototype.setBindings = function() {
    var self = this, pNodes, aBindings;

    function bindProp(p) {
      return function(e) {
        if(this instanceof HTMLInputElement ||
           this instanceof HTMLTextAreaElement) {
          self[p](this.value); 
        }
      };
    }

    for(var p in this.props) {
      pNodes = self.getNodesForProp(p);

      /* jshint ignore:start */
      (function(p) {
        for(var i = 0, l = pNodes.length; i < l; i++) {
          pNodes[i].addEventListener('change', bindProp(p)); 
        }
      })(p);
      /* jshint ignore:end */
    }

    self.getActionBindings().forEach(function(binding) {
      (function(b) {
        b.node.addEventListener(b.event, b.action); 
      })(binding);
    });
  };

  function assignValueToNodes(nodes, value) {
    for(var i = 0, l = nodes.length; i < l; i++) {
      node = nodes[i];

      if(node instanceof HTMLInputElement ||
         node instanceof HTMLTextAreaElement) {
        node.value = value;     
      } else {
        node.innerHTML = value; 
      }
    }
  }

  /**
   * Creates the view model
   *
   * @param {string} selector - Passed to VM to create scope
   * @param {function} cb - VM callback
   */
  function createViewModel(selector, cb) {
    var vm = new ViewModel(selector); 
    cb(vm);

    if(document.readyState !== 'loading') {
      vm.setBindings(); 
    } else {
      document.addEventListener('DOMContentLoaded', vm.setBindings.bind(vm));
    }
    
    return vm;
  }

  return {
    createViewModel: createViewModel 
  };
})();
