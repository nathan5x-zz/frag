!function(){
    function xval(sel, val, l, i) {
        for(l=document.querySelectorAll(sel),i=0;el=l[i++];) {
            if(val==null)
                return 'value' in el ? el.value : el.innerHTML
            else if('value' in el) {
                el.value = val
                if (el.tagName.toLowerCase()==='select') 
                    Array.prototype.forEach.call(el.querySelectorAll('option'), function(opt) {
                        opt.selected = (opt.value == val)
                    })
            }
            else el.innerHTML = val
        }
    }

    window.DaBi = function(sel, obj, prop, isEnum) {
        Object.defineProperty(obj, prop, {
            get: function(){return xval(sel)},
            set: function(v){xval(sel, v)},
            configurable: true,
            enumerable: !!isEnum
        })
    }
}()
