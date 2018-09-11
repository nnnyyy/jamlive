/**
 * Created by nnnyy on 2018-08-30.
 */
'use strict'
var HashMap = require('hashmap');

class KinManager {
    constructor() {
        this.wordInfoMap = new HashMap();
    }

    isExist(word) {
        return this.wordInfoMap.has(word);
    }

    register(word, desc) {
        if( this.isExist(word) ) {
            let item = this.wordInfoMap.get(word);
            item.tRegister = new Date();
            item.cnt++;
            return;
        }
        this.wordInfoMap.set(word, {desc: desc, tRegister: new Date(), cnt: 1});
    }

    update( tCur ) {
        var man = this;
        this.wordInfoMap.forEach(function(value, key) {
            if( tCur - value.tRegister > 10 * 2000) {
                man.wordInfoMap.delete( key );
            }
        });
    }

    getList() {
        const man = this;
        let list = [];
        this.wordInfoMap.forEach(function(value, key) {
            list.push({word: key, desc: value.desc, cnt: value.cnt });
        });

        list.sort(function(item1, item2) {
            return item2.cnt - item1.cnt;
        });

        list = list.slice(0, 6);

        return list;
    }
}

let man = new KinManager();

module.exports = man;