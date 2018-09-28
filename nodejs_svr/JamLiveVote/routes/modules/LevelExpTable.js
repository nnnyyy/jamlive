/**
 * Created by nnnyyy on 2018-08-28.
 */
'use strict'

class LevelExpTable {
    constructor() {
        this.lvTable = [
            100,
            300,
            500,
            1000,
            2000,
            4000,
            6000,
            8000,
            10000,
            15000,
            20000
        ];
    }

    isAbleLevelUp(currentAuth, curPoint) {
        if( currentAuth >= this.lvTable.length - 1 ) return false;
        var nextLevelExp = this.lvTable[currentAuth];

        console.log(`cur lv : ${currentAuth}, cur pt : ${curPoint}, nextLevelExp: ${nextLevelExp}`);

        if( curPoint >= nextLevelExp ) {
            return true;
        }

        return false;
    }
}

const o = new LevelExpTable();


module.exports = o;
