(function(){
Bind = function(dom, scope) {
	rewriteContent(dom, scope);
	bindAttrs(dom, [scope]);
};
var rewriteContent = function(dom, scope) {
	var html = dom.innerHTML;
	// replace all '?{myVar}' into '<span ?txt="myVar"></span>'
	var newHtml = html.replace(/\?{([^}]*)}/g, '<span ?txt="$1"></span>');
	// perf optim: re-write html only if necessary
	if(newHtml !== html) dom.innerHTML = newHtml;
};
var toStr = function(val) {
	return ( val===undefined || val===null ) ? "" : String(val);
};
var bindAttrs = function(dom, scopes) {
	var offset = 0;
	// for attribute
	if(dom.hasAttribute("?for")) {
		var value = dom.getAttribute("?for");
		dom.removeAttribute("?for");
		var forObss = parseFor(value), forArr = evalAsFunction(scopes, forObss.arr)(), forIdx = forObss.idx;
		var parentDom = dom.parentNode, endDom = dom.nextSibling, forObjs = [];
		parentDom.removeChild(dom);
		offset = -1 + forArr.length;
		// create initial for doms
		for(var a=0, len=forArr.length; a<len; ++a) forObjs.push({});
		syncForDoms(scopes, forArr, forObjs, forIdx, [], dom, parentDom, endDom);
		// array observer
		Array.observe(forArr, function(changes){
			var removedObjs = [];
			for(var c=0, len=changes.length; c<len; ++c){
				var change = changes[c], type = change.type, index = change.index;
				if(type=="splice") var nbRemoved = change.removed.length, nbAdded = change.addedCount;
				else if(type=="update") var nbRemoved = 1, nbAdded = 1;
				if(nbRemoved>0) removedObjs = removedObjs.concat(forObjs.splice(index, nbRemoved));
				for(var a=0; a<nbAdded; ++a) forObjs.splice(index, 0, {});
			}
			syncForDoms(scopes, forArr, forObjs, forIdx, removedObjs, dom, parentDom, endDom);
		});
	} else {
		// loop on attributes
		for(var a=0, attrs=dom.attributes, n=attrs.length; a<n; ++a) {
			var attr = attrs[a], name = attr.name, value = attr.value;
			if(name=="?if") {
				listenObjs(scopes, value, dom, function(val, dom) { dom.style.display = val ? null : "none"; });
			} else if(name=="?txt") {
				listenObjs(scopes, value, dom, function(val, dom) { dom.textContent = toStr(val); });
			} else if(name=="?html") {
				listenObjs(scopes, value, dom, function(val, dom) { dom.innerHTML = toStr(val); });
			} else if(name=="?val" || name=="?value") {
				listenObjs(scopes, value, dom, function(val, dom) { val = toStr(val); if(dom.value!==val) dom.value=val; });
				listenDom(scopes, dom, "input", value, function(dom, obj, attr) { obj[attr] = dom.value; });
			} else if(name.substring(0,3)==="?on") {
				var name2 = name.substr(1);
				dom[name2] = evalAsFunction(scopes, value);
			} else if(name.charAt(0)==='?') {
				var name2 = name.substr(1);
				listenObjs(scopes, value, dom, (function(name2){ return function(val, dom){ dom.setAttribute(name2, val); }})(name2));
			}
		}
		// recursive call to sons
		for(var c=0, children=dom.children, len=children.length; c<len; ++c) {
			var off = bindAttrs(children[c], scopes);
			c+=off; len+=off;
		}
	}
	return offset;
};
var evalAsFunction = function(scopes, str) {
	var objs = parseObjects(str);
	// define environment of function using scopes
	var pre = "";
	for(var s=0, len=scopes.length; s<len; ++s)  {
		pre += "var scope"+s+"=scopes["+s+"]; ";
	}
	// append scopes to variables
	var offset = 0;
	for(var o=0, len=objs.length; o<len; ++o) {
		var obj = objs[o];
		var numScope = findAssociatedScope(scopes, obj);
		if(numScope!==null) {
			var scopeStr = "scope"+numScope+"."
			var idx = obj.idx + offset;
			str = str.slice(0, idx) + scopeStr + str.slice(idx);
			offset += scopeStr.length;
		}
	}
	// prepend "return" for single instructions functions
	if(str.indexOf(";")===-1) str = "return "+str;
	// create function
	var funStr = pre+"var fun=function(){"+str+"}";
	eval(funStr);
	return fun;
};
var evalObject = function(scope, str) {
	return eval(str);
};
var findAssociatedScope = function(scopes, obj) {
	var head = obj.head;
	for(var s in scopes)
		if(head in scopes[s])
			return s;
	return null;
};
var prependScope = function(str) {
	return "scope" + (str ? "."+str : "");
};
var listenObjs = function(scopes, value, dom, callback) {
	var evalFun = evalAsFunction(scopes, value);
	var objs = parseObjects(value);
	for(var o=0, len=objs.length; o<len; ++o) {
		var obj = objs[o], numScope = findAssociatedScope(scopes, obj);
		if(numScope!==null) {
			var scope = scopes[numScope];
			var lst = evalObject(scope, prependScope(obj.lst));
			var attr = evalObject(scope, obj.att);
			Object.observe(lst, (function(attr){ return function(changes){
				for(var c=0, len=changes.length; c<len; ++c) {
					if(changes[c].name===attr){
						callback(evalFun(), dom);
					}
				}
			}})(attr));
		}
	}
	callback(evalFun(), dom);
};
var listenDom = function(scopes, dom, evt, value, callback) {
	var objs = parseObjects(value);
	if(objs.length===1) {
		var obj = objs[0], numScope = findAssociatedScope(scopes, obj);
		if(numScope!==null) {
			var scope = scopes[numScope];
			var lst = evalObject(scope, prependScope(obj.lst)), attr = evalObject(scope, obj.att);
			dom.addEventListener(evt, function(){ callback(dom, lst, attr); });
		}
	}
};
var parseObjects = function(str) {
	var regVar = /[a-zA-Z0-9][a-zA-Z0-9\.\[\]'"]*/g;
	var regHead = /^([a-zA-Z0-9]+).*/;
	var regNoAttr = /^([a-zA-Z0-9]+)$/;
	var regAttr1 = /(.*)\.([a-zA-Z0-9]+)$/;
	var regAttr2 = /(.*)\[([a-zA-Z0-9'"]+)\]$/;
	var out = [], resVar, resHead, resAttr;
	while (resVar = regVar.exec(str)) {
		var idx = resVar.index;
		var strVar = resVar[0];
		var head = regHead.exec(strVar)[1];
		var lst, att=null;
		if(resAttr = regNoAttr.exec(strVar)) {
			att = "'"+resAttr[1]+"'";
		} else if(resAttr = regAttr1.exec(strVar)) {
			lst = resAttr[1]; att = "'"+resAttr[2]+"'";
		} else if(resAttr = regAttr2.exec(strVar)) {
			lst = resAttr[1]; att = resAttr[2];
		}
		if(att) out.push({idx:idx, head:head, lst:lst, att:att})
	}
	return out;
};
var parseFor = function(str) {
	var reg = /(.*) in (.*)/;
	var res;
	if(res = reg.exec(str)) {
		return {idx:res[1].split(','), arr:res[2]};
	} else {
		return {arr:str};
	}
};
var syncForDoms = function(scopes, forArr, forObjs, forIdx, removedObjs, modelDom, parentDom, endDom) {
	// remove doms
	for(var o=0, len=removedObjs.length; o<len; ++o) {
		var domToRemove = removedObjs[o].dom;
		if(domToRemove) parentDom.removeChild(domToRemove);
	}
	// add doms
	for(var len=forObjs.length, o=len-1; o>=0; --o) {
		var forObj = forObjs[o], forDom=forObj.dom;
		if(!forDom) {
			var nextDom = (o+1>=forObjs.length) ? endDom : forObjs[o+1].dom;
			var newDom = parentDom.insertBefore(modelDom.cloneNode(true), nextDom);
			forObj.dom = newDom;
			var newScopes = scopes;
			// fill index and value (if exists)
			if(forIdx) {
				var nbIdx = forIdx.length;
				if(nbIdx>0) {
					var keyAtt = forIdx[0];
					var newScope = {};
					newScope[keyAtt] = 0;
					var newScopes = scopes.slice();
					newScopes.push(newScope);
					forObj.keyObj = newScope;
					forObj.keyAtt = keyAtt;
					// number will be filled during renumbering
				}
				if(nbIdx>1) {
					var valAtt = forIdx[1];
					newScope[valAtt] = forArr[o];
				}
			}
			// bind new node
			bindAttrs(newDom, newScopes);
		}
	}
	// renumber
	for(var i=0, len=forObjs.length; i<len; ++i) {
		var forObj = forObjs[i], keyObj = forObj.keyObj, keyAtt = forObj.keyAtt;
		if(keyObj) keyObj[keyAtt] = i;
	}
};
}());
