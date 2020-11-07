import axios from 'axios';
const WebSocket = require('ws');
import { v4 as uuidv4 } from 'uuid';
import { CustomMessageUser } from './Model/CustomMessageUser';
import { Bridge, PartySession } from './Model/PartySession';


class PartyChat {
    readonly authorizationToken: string;
    readonly contextId: string;
    private groupId: string;
    private sessionId: string;
    private sequenceNumber: number;
    private partySession: PartySession;

    constructor(readonly token: string)
    {
        this.authorizationToken = token;
        this.contextId = uuidv4(); // context ID used for this peer.

        axios.defaults.headers.common['Authorization'] = 'bearer ' + this.authorizationToken;
    }

    setGroupId(id: string) {
        this.groupId = id;
    }

    getGroupId() : string {
        return this.groupId;
    }

    getPartySession() : PartySession {
        return this.partySession;
    }

    setPartySession(session: PartySession) {
        this.partySession = session;
    }

    /**
     * Gets the URL Sony uses to communicate via websocket messaging.
     */
    getSignalingChannelUrl() : string {
        axios.get('https://mobile-pushcl.np.communication.playstation.net/np/serveraddr?version=2.1&fields=keepAliveStatus&keepAliveStatusType=3', {
        }).then((response) => {
            return response.data.fqdn;
        }).catch((err) => {
            throw err;
        });

        return null;
    }

    /**
     * Pops a websocket signaling channel for messages.
     * 
     * @param signalingUrl getSignalingChannelUrl()
     */
    createSignalingSocket(signalingUrl: string) : WebSocket {
        var options = {
            headers: {
                "X-PSN-RECONNECT": "false",
                "X-PSN-APP-VER": "20.9.3",
                "X-PSN-OS-VER": "13.5",
                "X-PSN-PROTOCOL-VERSION": "2.1",
                "X-PSN-KEEP-ALIVE-STATUS-TYPE": "3",
                "X-PSN-APP-TYPE": "MOBILE_APP.PSAPP",
                "Origin": "wss://" + signalingUrl

            },
            protocolVersion: 13,
            rejectUnauthorized: false,
        };

        return new WebSocket('wss://' + signalingUrl + '/np/pushNotification', "np-pushpacket", options);
    }

    /**
     * Generates the customData1 param.
     * 
     * This is just the current groupID but it gets right-padded with nulls to 76 bytes and doubly encoded with base64.
     */
    generateCustomData1() : string
    {
        let groupIdBuffer = Buffer.from(this.getGroupId());
        let finalLength = 76 - groupIdBuffer.length; // ??? For some reason sony pads the final buffer with nulls.
        let nullBuffer = Buffer.alloc(finalLength);
        let paddedBuffer = Buffer.concat([groupIdBuffer, nullBuffer]);

        // Doubly encoded string for some reason.
        return Buffer.from((paddedBuffer.toString('base64'))).toString('base64');
    }

    /**
     * Generates the customData2 param.
     * 
     * This seems to be just for the party host. Unsure what isKratosUser is for but might be worth messing with.
     */
    generateCustomData2() : string
    {
        let data = {"shareplay":{"isKratosUser":false,"psPlusAuthorized":true}};
        return Buffer.from(data).toString('base64');
    }

    /**
     * Generates the customData3 param.
     * 
     * This param is the current party session id and the current account id, left padded with nulls to 21 chars.
     * @param accountId 
     */
    generateCustomData3() : string
    {
        let accountId = 'temp';
        return Buffer.from(this.sessionId + "\n" + accountId).toString('base64');

    }

    /**
     * Generates the customData4 param.
     * 
     * I believe these are just some properties for the current peer. This param gets changed whenever you mute/unmute your audio.
     * 
     * @TODO: Map this out.
     */
    generateCustomData4() : string
    {
        return Buffer.from('[ "", "", "1", "0", "0.0.0", "0", "0" ]').toString('base64');
    }

    /**
     * Joins the selected group's party session.
     */
    joinParty() {
        axios.post(`https://m.np.playstation.net/api/gamingLoungeGroups/v1/groups/${this.getGroupId()}/partySessions`, {
            customData1: this.generateCustomData1(),
            maxMembers: 16,
            member: {
                customData4: this.generateCustomData4(),
                pushContexts: [{
                    contextId: this.contextId
                }],
                voiceChatActivated: 'True'
            }
        });
    }

    /**
     * Updates customData3 param for this peer.
     */
    updateCustomData3() : boolean {
        axios.patch('https://m.np.playstation.net/api/sessionManager/v1/partySessions/' + this.sessionId  + '/members/me.MOBILE_APP', {
            customData3: this.generateCustomData3()
        }).then((response) => {
            return true;
        }).catch((err) => {
            throw err;
        });

        return false;
    }

    /**
     * Updates customData4 param for this peer.
     */
    updateCustomData4() : boolean {
        axios.patch('https://m.np.playstation.net/api/sessionManager/v1/partySessions/' + this.sessionId  + '/members/me.MOBILE_APP', {
            customData4: this.generateCustomData4()
        }).then(() => {
            return true;
        }).catch((err) => {
            throw err;
        })
        return false;
    }

    /**
     * Gets all party sessions.
     */
    getPartySessions(): PartySession[] {
        axios.get('https://m.np.playstation.net/api/sessionManager/v1/partySessions?view=v1-all', {
            headers: {
                'X-PSN-SESSION-MANAGER-SESSION-IDS': this.sessionId,
                'X-PSN-SESSION-MANAGER-GROUP-IDS': this.groupId
            }
        }).then((response) => {
            return response.data.partySessions as PartySession[];
        });

        return [];
    }
    
    /**
     * Obtain a bridge.
     */
    getBridge(): Bridge {
        axios.post('https://m.np.playstation.net/api/rtcBridge/v1/bridges', {}, {
            headers: {
                'X-PSN-RTC-TITLE-ID': 'METROPOL_IOS'
            }
        })
        .then((response) => {
            return response.data.bridge as Bridge;
        })
        .catch((err) => { throw err; });

        return null;
    }

    createBridge(bridges: Bridge[]) : boolean {
        axios.post(`https://m.np.playstation.net/api/sessionManager/v1/partySessions/${this.partySession}/bridges`, {
            bridges: bridges
        })
        .then((response) => {
            console.log(response.status);
            return true;
       })
        .catch((err) => { throw err; })

        return false;
    }

    getPeers(bridge: Bridge) {
        axios.post('https://m.np.playstation.net/api/rtcBridge/v1/bridges/' + bridge.bridgeId + '/peers?allow_duid_duplication=false', {
        }, {
            headers: {
                'X-PSN-BRIDGE-TOKEN': bridge.bridgeToken,
                'X-PSN-RTC-TITLE-ID': 'METROPOL_IOS'
            }
        })
    }

    /**
     * Makes a WebRTC offer to the peer.
     * 
     * @param bridge
     * @param peerId 
     */
    makeOffer(bridge: Bridge, peerId: string) {
        axios.post('https://m.np.playstation.net/api/rtcBridge/v1/bridges/' + bridge.bridgeId  +'/peers/' + peerId  + '/offer', {
            "mediaTypes" : {
                "application" : {
                "isRequired" : true
                },
                "audio" : {
                "isRequired" : true,
                "opus" : [
                    {
                        "bitrate" : 12,
                        "channels" : 1,
                        "codec" : "SILK",
                        "ptime" : 40,
                        "samplingRates" : [ 16000 ]
                    },
                    {
                        "bitrate" : 24,
                        "channels" : 1,
                        "codec" : "CELT",
                        "ptime" : 40,
                        "samplingRates" : [ 16000 ]
                    }
                ]
                }
            }
        }, {
            headers: {
                'X-PSN-RTC-TITLE-ID': 'METROPOL_IOS'
            }
        })
    }

    makeAnswer(bridge: Bridge, peerId: string, sdp: string): boolean {
        axios.post('https://m.np.playstation.net/api/rtcBridge/v1/bridges/' + bridge.bridgeId  +'/peers/' + peerId  + '/offer', {
            answer: {
                sdp
            }
        }, {
            headers: {
                'X-PSN-RTC-TITLE-ID': 'METROPOL_IOS'
            }
        })
        .then(() => { return true; })
        .catch((err) => { throw err; });

        return false;
    }

    /**
     * This generates a payload that should be used for sendCustomMessage.
     * 
     * The header structure is still unknown.
     * 
     * @param message JSON data
     */
    generateCustomMessagePayload(message: string) : Buffer {
        let magic = Buffer.from([0x01, 0x00, 0x00, 0x01]); // Sometimes, this last byte is 0x01.
        let unk1 = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
        let unk2 = Buffer.from([0x9B, 0xC5, 0x19, 0x13, 0xCE, 0xFE, 0x5A, 0x3D, 0xA1, 0x86, 0x01]);
        let padding = Buffer.alloc(15, 0x00);
        let unk3 = Buffer.from([0x62, 0x01, 0x00, 0x00]); // This changes per message. Maybe some type of timer or count?
        let unk4 = Buffer.from([0x32, 0x2F, 0x31, 0x2F, 0x31, 0x0a]);
        
        return Buffer.concat([
            magic,
            unk1,
            unk2,
            padding,
            unk3,
            unk4,
            Buffer.from(message),
        ]);
    }

    /**
     * Sends a custom message to the party session.
     * 
     * @param payload Buffer payload.
     * @param users List of users to send this message to.
     */
    sendCustomMessage(payload: Buffer, users: CustomMessageUser[])
    {
        axios.post(`https://m.np.playstation.net/api/sessionManager/v1/partySessions/${this.sessionId}/customMessage`, {
            channel: 'miranda:12',
            payload: 'payload=ver=1.0, type=binary, body= ' + payload.toString('base64'),
            to: users,
            withoutSequenceNumber: true
        })
        .then((response) => {
            console.log(response.status);
            return true;
        })
        .catch((err) => { throw err; });

        return false;
    }
}

module.exports = PartyChat;