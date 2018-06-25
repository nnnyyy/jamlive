/**
 * Created by nnnyy on 2018-05-16.
 */
function isMobile() {
    if( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ) {
        // is mobile..
        return true;
    }

    return false;
}

function strip(html)
{
    var tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
}

Map = function(){
    this.map = new Object();
};

Map.prototype = {
    put : function(key, value){
        this.map[key] = value;
    },
    get : function(key){
        return this.map[key];
    },
    containsKey : function(key){
        return key in this.map;
    },
    containsValue : function(value){
        for(var prop in this.map){
            if(this.map[prop] == value) return true;
        }
        return false;
    },
    isEmpty : function(key){
        return (this.size() == 0);
    },
    clear : function(){
        for(var prop in this.map){
            delete this.map[prop];
        }
    },
    remove : function(key){
        delete this.map[key];
    },
    keys : function(){
        var keys = new Array();
        for(var prop in this.map){
            keys.push(prop);
        }
        return keys;
    },
    values : function(){
        var values = new Array();
        for(var prop in this.map){
            values.push(this.map[prop]);
        }
        return values;
    },
    size : function(){
        var count = 0;
        for (var prop in this.map) {
            count++;
        }
        return count;
    },
    toString : function(){
        var s=[];
        for(var prop in this.map){
            s.push(prop+':'+this.map[prop]);
        }
        return s.join(',');
    }
};


function setCookie(name,value,expiredays) {
    var todayDate = new Date();
    todayDate.setDate(todayDate.getDate() + expiredays);
    document.cookie = name + "=" + escape(value) + "; path=/; expires=" + todayDate.toGMTString() + ";";
}

function getCookie(name)
{
    var nameOfCookie = name + "=";
    var x = 0;
    while (x <= document.cookie.length)
    {
        var y = (x+nameOfCookie.length);
        if (document.cookie.substring( x, y ) == nameOfCookie)
        {
            if ((endOfCookie=document.cookie.indexOf(";",y)) == -1)
            {
                endOfCookie = document.cookie.length;
            }
            return unescape(document.cookie.substring(y,endOfCookie));
        }

        x = document.cookie.indexOf(" ",x) + 1;
        if (x == 0)
        {
            break;
        }
    }
    return "";
}