const constraints = {audio: true, video: true};
const configuration = {iceServers: [{urls: 'stun:stn.np.community.playstation.net'}]};
const pc = new RTCPeerConnection();

const socket = io('http://localhost:5000');

socket.on('connect', () => {
    socket.emit('init');
});

socket.on('fqdn-url', (url) => {
    console.log('got url', url);
});