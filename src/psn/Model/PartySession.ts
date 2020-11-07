export interface PartySession {
    sessionId:        string;
    createdTimestamp: string;
    maxMembers:       number;
    members:          Member[];
    bridges:          Bridge[];
    customData1:      string;
}

export interface Bridge {
    bridgeId:    string;
    bridgeToken: string;
    bridgeEtag:  string;
}

export interface Member {
    accountId:          string;
    onlineId:           string;
    platform:           string;
    deviceUniqueId:     string;
    joinTimestamp:      string;
    voiceChatActivated: boolean;
    customData2:        string;
    customData3:        string;
    customData4:        string;
}
