/**
 * Created by nnnyy on 2018-10-06.
 */
'use strict'

var SERV_TO_CLIENT = {
    UPDATE_INFO: 'update-info',
    UPDATE_NOTICE: 'update-notice',
    LOCAL_HINT: 'memo',
    GLOBAL_HINT: 'global-memo',
    LOGIN_INFO: 'loginInfo'
}

var CLIENT_TO_SERV = {
    VOTE: 'vote',
    CHAT: 'chat',
    SEARCH: 'search',
    BAN: 'ban',
    PERMANENT_BAN: 'permanentban',
    LIKE: 'like',
    LOCAL_HINT: 'memo',
    SELECT_SERVER: 'go',
    GET_VOTE_LIST: 'get-vote-list',
    GET_SEARCH_LIST: 'get-search-list',
    SERV_INFO_RELOAD: 'server-info-reload',
    BAN_RELOAD: 'ban-reload'
}


exports.SERV_TO_CLIENT = SERV_TO_CLIENT;
exports.CLIENT_TO_SERV = CLIENT_TO_SERV;