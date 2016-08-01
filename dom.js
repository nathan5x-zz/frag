"use strict";

/**
 * Infinite, split-pane grid that renders the 'rows' on demand as the user scrolls through the list. The scroll track height and position
 * are determined based on the total number of rows, so the users get the 'real' picture of how long is the list. The rows that are not in the
 * 'visible' window are automatically retired to make room for the ones that are brought into the view.
 * The rows themselves can optionally be 'split' into static columns and dynamic columns. The static columns stay in the view all the times
 * and the dynamic columns are scrolled horizontally as necessary. Vertical scrolling scrolls both the sections of the row.
 * @param      {Array}   schema. Describes the column properties. Each item is an object, which describes the column. The expected
 * 						 values are label (column label), fmt (format), rw (R/W) at the minimum.
 * @param      {string}  renderAt. The CSS selector that identifies the container where the grid is to be rendered.
 *
 */
function SplitGrid(schema, renderAt) {
	
	var rowHeight = 32,
	/*
	 * The Infinite scroll bar itself. w and h indicate the bar width and height. All scroll events are attached to this bar.
	 */
		ScrollBar = function (h, w) {
			var sbarWidth = w ? w : 12, sbarMargin = 3, scrollWidth = sbarWidth + sbarMargin * 2, minBarLen = 40,
				scrolltrack = document.querySelector(renderAt + ' .scrolltrack'),
				scrolltrackHeight = h - 2, me = this;
			
			scrolltrack.style.height = h - 2;
			scrolltrack.style.width = scrollWidth - 2;
		
			var scrollbar = document.createElement('div'), barLen, barY, mousedownGrip;
			scrollbar.className = 'scrollbar';
			scrollbar.style.width = sbarWidth - 2;
			scrollbar.style.height = h / 2;
			scrollbar.style.top = 0;
			scrollbar.style.left = sbarMargin;
		
			scrolltrack.appendChild(scrollbar);
		
			// Sets lengths of scrollbar by percentage
			this.setLength = function(l) {
				// limit 0..1
				l = Math.max(Math.min(1, l), 0);
				l *= scrolltrackHeight;
				barLen = Math.max(l, minBarLen);
				scrollbar.style.height = barLen;
			}
		
			// Moves scrollbar to position by Percentage
			this.setPosition = function(p) {
				p = Math.max(Math.min(1, p), 0);
				var emptyTrack = scrolltrackHeight - barLen;
				barY = p * emptyTrack;
				scrollbar.style.top = barY;
			}
		
			this.setLength(1);
			this.setPosition(0);
			this.onScroll = new SimpleEvent();
					
			function onDown(event) {
				event.preventDefault();
		
				if (event.target == scrollbar) {
					mousedownGrip = event.offsetY;
					scrolltrack.addEventListener('mousemove', onMove, false);
					scrolltrack.addEventListener('mouseup', onUp, false);
				} else {
					if (event.offsetY < barY) {
						me.onScroll.notify('pageup');
					} else if (event.offsetY > (barY + barLen)) {
						me.onScroll.notify('pagedown');
					}
					// if want to drag scroller to empty track instead
					// me.setPosition(event.offsetY / (scrolltrackHeight - 1));
				}
			}
		
			function onMove(event) {
				event.preventDefault();
		
				if (event.target == scrollbar) {
					var emptyTrack = scrolltrackHeight - barLen;
					var scrollto = (barY + event.offsetY - mousedownGrip) / emptyTrack;
					me.setPosition(scrollto);
					me.onScroll.notify('scrollto', scrollto);
					return;
		
				}
				var emptyTrack = scrolltrackHeight - barLen,
					scrollto = (event.offsetY - mousedownGrip) / emptyTrack;
				me.setPosition(scrollto);
				me.onScroll.notify('scrollto', scrollto);
			}
		
			function onUp(event) {
				onMove(event);
				scrolltrack.removeEventListener('mousemove', onMove, false);
				scrolltrack.removeEventListener('mouseup', onUp, false);
			}
		
			scrolltrack.addEventListener('mousedown', onDown, false);
	},
	/*
	 * Implements a simple event handler for creating, deleting, and firing events.
	 */
	SimpleEvent = function () {
		var listeners = [];
	
		this.add = function(target) {
			listeners.push(target);
		}
	
		this.remove = function(target) {
			var index = listeners.indexOf(target);
			if (index >= 0) {
				listeners.splice(index, 1);
			}
		}
	
		this.notify = function() {
			var i, il;
			for (i=0,il=listeners.length; i<il; i++) {
				listeners[i].apply(this, arguments);
			}
		}
	},
	
	/*
	 * The Scroll pane. This is the pane into which the grid will be rendered. w and h indicate the scroll pane width and height.
	 * The pane accommodates showing static and floating columns and infinite-scrolling grid.
	 */
	ScrollPane = function (w, h) {		
		this.width = w;
		this.height = h;
	
		var me = this,
			sbarWidth = 12, padding = 20,
			container = document.querySelector(renderAt),
			staticpane = document.querySelector(renderAt+ ' .staticpane'),	
			leftcanvas = staticpane.querySelector('.canvas.body'),	/* For fixed fields. */
			floatingpane = document.querySelector(renderAt+ ' .floatingpane'),
			rightcanvas = floatingpane.querySelector('.canvas.body'), /* For floating, scrollable fields. */
			scrollbar = new ScrollBar(h, sbarWidth),
			containerWidth = w - sbarWidth,
			leftpaneWidth = 4 * 100 + 50 + padding,
			rightpaneWidth = containerWidth - leftpaneWidth - 5;
		
		container.style.width = containerWidth;
		container.style.height = h;
	
		staticpane.width = staticpane.style.width = leftpaneWidth;
		staticpane.height = staticpane.style.height = h;
		
		floatingpane.width = floatingpane.style.width = rightpaneWidth;
		floatingpane.height = floatingpane.style.height = h;
		
		this.scrollbar = scrollbar;
		
		var pageOffset = h / 2 * 40, scrollTop = -60, innerHeight = h,
			onWheel = function(e) {
				var delta = e.wheelDelta;
				if (e.deltaY !== 0) {
					e.preventDefault();
					scrollTop-=delta;
					me.draw();
					me.updateScrollbar();
				}
			},
			/* The mouse wheel event is fired rapidly, so we don't want to have a lot of conditions in the callback, 
			 * so a separate handler is registered for FF.
			 */
			onWheelFF = function(e) {
				var delta = -e.detail * 120;
				if (e.axis === 2) {
					e.preventDefault();
					scrollTop-=delta;
					me.draw();
					me.updateScrollbar();
				}
			};
	
		scrollbar.onScroll.add(function(type, scrollTo) {
			switch (type) {
				case 'pageup':
					scrollTop -= pageOffset;
					me.draw();
					me.updateScrollbar();
					break;
				case 'pagedown':
					scrollTop += pageOffset;
					me.draw();
					me.updateScrollbar();
					break;
				case 'scrollto':
					scrollTop = scrollTo  * (innerHeight - h);
					me.draw();
					break;
			}
		});
			
		container.addEventListener('mousewheel', onWheel, false);
		/* For Firefox */
		container.addEventListener('DOMMouseScroll', onWheelFF, false);

		var items = [], onscreen = [];
		this.items = items;
	
		/* 
		 * Render what should be in the visible pane.
		 */
		this.draw = function() {		
			scrollTop = Math.max(Math.min(scrollTop, innerHeight - h), 0);
	
			var oldscreen = onscreen, creating = 0, destorying = 0, item;
			onscreen = [];
	
			for (var i=0, il=items.length;i<il;i++) {
				item = items[i];
				if ((item.y + item.height >= scrollTop) && (item.y <= h + scrollTop)) {
					if (!item.dom) {
						creating++;
					}
					item.draw(leftcanvas, rightcanvas, scrollTop);
					onscreen.push(item);
				}
			}
	
			for (var i=0, il=oldscreen.length;i<il;i++) {
				item = oldscreen[i];
				if (onscreen.indexOf(item)==-1) {
					item.destory(leftcanvas, rightcanvas);
					destorying++;
				}
			}		
		}
			
		this.add = function(item) {
			items.push(item);
			innerHeight = item.y + item.height;
		}
	
		this.updateScrollbar = function() {
			var item = this.items[this.items.length - 1];
			innerHeight = item.y + item.height;
			me.scrollbar.setLength(me.height / innerHeight);
			me.scrollbar.setPosition(scrollTop / (innerHeight-h));
		}
	},
	RowItem = function(row) {
		this.row = row;
		this.height = rowHeight;
	}, 
	prepare = function() {
		var pane = new ScrollPane(960, 480),
			lasty = 60, item;

		for (var i=1;i<=100000;i++) {
			var row = [];
			for (var f =0, flen = fields.length; f < flen; f++) {
				row.push({'name': fields[f], 'fmt': f === 0 ? 'str' : 'amt', 'value': (f === 0 ? ('Hiearchy-Level-'+i) : Math.random()*1200000)});
			}
			item = new RowItem(row);
			item.y = lasty;
			item.x = 0;
			lasty += item.height;
			pane.add(item);
		}
		pane.updateScrollbar();
		pane.draw();
	}
	
	RowItem.prototype.draw = function(leftcanvas, rightcanvas, translate) {
		if (!this.dom) {	
			this.dom=[];
			
			this.dom[0] = Elm('div', {'class': 'line infi'})(
				this.row.map(function(col, cid) { 
					if (cid < 4) {
						var val =  money(col.value);
						return Elm('div', {'class': 'cell nospace ' + (col.fmt === 'str'? 'name': 'other')})(
							col.fmt === 'str'? Elm('span')(val) : Elm('input', {type: 'text', 'value': val})()
						);
					}
				}).filter(function(el) {
					return el !== undefined;
				})
			)
			this.dom[1] = Elm('div', {'class': 'line infi'})(
				this.row.map(function(col, cid) { 
					if (cid >= 4) {
						var val =  money(col.value);
						return Elm('div', {'class': 'cell nospace ' + (col.fmt === 'str'? 'name': 'other')})(
							col.fmt === 'str'? Elm('span')(val) : Elm('input', {type: 'text', 'value': val})()
						);
					}
				}).filter(function(el) {
					return el !== undefined;
				})
			)
			leftcanvas.appendChild(this.dom[0]);
			rightcanvas.appendChild(this.dom[1]);
		}
		for (var d in this.dom) {
			this.dom[d].style.top = this.y - translate;
		}
	}
	
	RowItem.prototype.destory = function(leftcanvas, rightcanvas) {
		if (this.dom && this.dom.length === 2) {
			leftcanvas.removeChild(this.dom[0]);
			rightcanvas.removeChild(this.dom[1]);
			this.dom.length = 0;
			this.dom = null;
		}
	}
	
	// Prepare Data.
	prepare();

}

