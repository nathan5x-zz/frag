/**
 * Data Binder entery point
 * @param {!Object} model any JavaScript object
 * @param {Node=} optNode document.body will be used as a default node
 * @constructor
 */
var DataBinder = function (model, optNode) {

	/**
	 *
	 * @type {!Object}
	 * @private
	 */
	this.__model = model;


	/**
	 *
	 * @type {Node|HTMLElement}
	 * @private
	 */
	this.__node = optNode || document.body;


	/**
	 *
	 * @type {Array}
	 * @private
	 */
	this.__childBinders = [];


	/**
	 *
	 * @type {string[]}
	 * @private
	 * @const
	 */
	this.__INPUT_TYPES = ['INPUT', 'TEXTAREA', 'SELECT'];


	this.__bindModel();
	this.__bindView();
	this.__update();
};


/**
 *
 * @return {Object} binded model
 */
DataBinder.prototype.getModel = function () {
	return this.__model;
};


/**
 *
 * @return {Array} child binders generated
 */
DataBinder.prototype.getChildren = function () {
	return this.__childBinders;
};


/**
 *
 * @private
 */
DataBinder.prototype.__bindModel = function () {
	var self = this;

	this.__observer(function (values) {
		self.__find(self.__buildSelector(values)).each(function () {
			var value;
			var $this = $(this);

			if ($this.data().bindShow) {
				self._bindShow($this);
			} else if ($this.data().bindHide) {
				self._bindHide($this);
			}

			if ($this.data().bindRepeat) {
				self._bindRepeat($this);
			}

			if ($this.data().bind) {
				value = self.__model[$this.data().bind];

				if (self.__INPUT_TYPES.indexOf(this.nodeName) !== -1) {
					$this.val(value);
				} else {
					$this.html(value);
				}
			}
		});
	});
};


/**
 *
 * @private
 */
DataBinder.prototype.__bindView = function () {
	var self = this;

	this.__find(this.__buildSelector()).each(function () {
		var $this = $(this);

		for (var index in $this.data()) {
			self['_' + index]($this);
		}
	});
};


/**
 *
 * @private
 */
DataBinder.prototype.__update = function () {
	var tmp;

	for (var index in this.__model) {
		if (this.__model.hasOwnProperty(index)) {
			tmp = this.__model[index];
			this.__model[index] = undefined;
			this.__model[index] = tmp;
		}
	}
};


/**
 *
 * @param {Object} values
 * @return {string}
 * @private
 */
DataBinder.prototype.__buildSelector = function (values) {
	var selector = [];

	if (values) {
		for (var i = 0; i < values.length; i ++) {
			selector.push('[data-bind="' + values[i].name + '"]');
			selector.push('[data-bind-show="' + values[i].name + '"]');
			selector.push('[data-bind-hide="' + values[i].name + '"]');
			selector.push('[data-bind-repeat="' + values[i].name + '"]');
		}
	} else {
		for (var index in this.__model) {
			if (this.__model.hasOwnProperty(index)) {
				if (typeof this.__model[index] === 'function') {
					selector.push('[data-bind-click="' + index + '"]');
					selector.push('[data-bind-init="' + index + '"]');
				} else {
					selector.push('[data-bind="' + index + '"]');
					selector.push('[data-bind-show="' + index + '"]');
				}
			}
		}
	}

	return selector.join();
};


/**
 *
 * @param selector
 * @return {Array<jQuery>}
 * @private
 */
DataBinder.prototype.__find = function (selector) {
	return $(this.__node).find(selector).andSelf();
};


/**
 *
 * @param {Function} callback
 * @private
 */
DataBinder.prototype.__observer = function (callback) {
	Object.observe(this.__model, callback);
};


/**
 *
 * @param {jQuery} $this
 * @private
 */
DataBinder.prototype._bind = function ($this) {
	var self = this;

	$this.change(function () {
		self.__model[$(this).data().bind] = $(this).val();
	});
};


/**
 *
 * @param {jQuery} $this
 * @private
 */
DataBinder.prototype._bindClick = function ($this) {
	var self = this;

	$this.click(function () {
		self.__model[$(this).data().bindClick](this);
	});
};


/**
 *
 * @param {jQuery} $this
 * @private
 */
DataBinder.prototype._bindInit = function ($this) {
	this.__model[$this.data().bindInit]($this);
};


/**
 *
 * @param {jQuery} $this
 * @private
 */
DataBinder.prototype._bindRepeat = function ($this) {
	var element, node, model, dataBinder;
	var data = this.__model[$this.data().bindRepeat];
	var parent = $($this.parents()[0]);

	if (data) {
		for (var i = 0; i < data.length; i++) {
			element = data[i];
			node = $this.clone(true);
			model = element;

			if (typeof element !== 'object') {
				model = {value: element.toString()};
				node.data('bind', 'value');
			}

			parent.append(node);
			dataBinder = new DataBinder(model, node);
			this.__childBinders.push(dataBinder);
		}

		$this.remove();
	}
};


/**
 *
 * @param {jQuery} $this
 * @private
 */
DataBinder.prototype._bindHide = function ($this) {
	var hide = Boolean(this.__model[$this.data().bindHide]);

	if (!hide) {
		$this.css('display', 'block');
	} else {
		$this.css('display', 'none');
	}
};


/**
 *
 * @param {jQuery} $this
 * @private
 */
DataBinder.prototype._bindShow = function ($this) {
	var show = Boolean(this.__model[$this.data().bindShow]);

	if (show) {
		$this.css('display', 'block');
	} else {
		$this.css('display', 'none');
	}
};
