import axios from 'axios';
import qs from 'qs';

module.exports = (refreshToken: string) => {
    axios.post('https://ca.account.sony.com/api/authz/v3/oauth/token', qs.stringify({
        scope: 'psn:mobile.v1 psn:clientapp',
        refresh_token: refreshToken,
        token_format: 'jwt',
        grant_type: 'refresh_token'
    }),
    {
        headers: {
            'content-type': 'application/x-www-form-urlencoded;charset=utf-8',
            'authorization': 'Basic YWM4ZDE2MWEtZDk2Ni00NzI4LWIwZWEtZmZlYzIyZjY5ZWRjOkRFaXhFcVhYQ2RYZHdqMHY='
        }
    }).then((response) => {
        return response.data.access_token;
    }).catch((err) => {
        throw err;
    });
};
