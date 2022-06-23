const http = require('http');
const dorita980 = require('dorita980');
const promClient = require('prom-client');

const ip = process.env.ROOMBA_IP_ADDRESS;
const username = process.env.ROOMBA_USERNAME;
const password = process.env.ROOMBA_PASSWORD;

const iRobotChargingGuage = new promClient.Gauge({
    name: 'roomba_charging',
    help: 'Roomba is charging',
    labelNames: ['ip']
});

const iRobotCleaningGuage = new promClient.Gauge({
    name: 'roomba_running',
    help: 'Roomba is cleaning',
    labelNames: ['ip']
});

const iRobotBatteryGuage = new promClient.Gauge({
    name: 'roomba_battery',
    help: 'Battery percent of the Roomba',
    labelNames: ['ip']
});

const iRobotBinFullGuage = new promClient.Gauge({
    name: 'roomba_bin_full',
    help: 'Roomba`s bin is full',
    labelNames: ['ip']
});

const iRobotBinPresentGuage = new promClient.Gauge({
    name: 'roomba_bin_present',
    help: 'Roomba`s bin is present',
    labelNames: ['ip']
});

const iRobotGoingHomeGuage = new promClient.Gauge({
    name: 'roomba_going_home',
    help: 'Roomba is going home',
    labelNames: ['ip']
});

const iRobotReadyToVacuumGuage = new promClient.Gauge({
    name: 'roomba_ready_to_vacuum',
    help: 'Roomba is ready to vacuum',
    labelNames: ['ip']
});

const roombaStatusDefault = {
    cleaning: 0,
    charging: 0,
    going_home: 0,
    ready_to_vacuum: 0,
    bin_present: 0,
    bin_full: 0,
    battery_percent: 0,
};

function getMetrics() {
  const iRobot = new dorita980.Local(username, password, ip);
  console.log(`Connected to Roomba with IP: ${ip}`);
  iRobot.getMission()
  .then((mission) => {
    let roombaStatus = getRoombaStatus(mission);
    setRoombaMetrics(roombaStatus);
  })
  .then(() => iRobot.end()) // disconnect to leave free the channel for the mobile app.
  .catch(console.log);

}

function getRoombaStatus(data) {

  if (!data || (!data['cleanMissionStatus'] && !data['bin'])) {
    return roombaStatusDefault;
  }

  let cleanMissionStatus = data['cleanMissionStatus'];
  let bin = data['bin'];
  let battery = data['batPct'];

  let roombaStatus = {
    cleaning: cleanMissionStatus['cycle'] === 'clean' & 1,
    charging: cleanMissionStatus['phase'] === 'charge' & 1,
    going_home: cleanMissionStatus['phase'] === 'hmUsrDock' & 1,
    ready_to_vacuum: cleanMissionStatus['notReady'] == 0 & 1,
    bin_present: bin['present'] & 1,
    bin_full: bin['full'] & 1,
    battery_percent: battery,
  };

  return roombaStatus;
}

function setRoombaMetrics(roombaStatus) {
  iRobotChargingGuage.labels(ip).set(roombaStatus.charging);
  iRobotBatteryGuage.labels(ip).set(roombaStatus.battery_percent);
  iRobotBinFullGuage.labels(ip).set(roombaStatus.bin_full);
  iRobotBinPresentGuage.labels(ip).set(roombaStatus.bin_present);
  iRobotCleaningGuage.labels(ip).set(roombaStatus.cleaning);
  iRobotGoingHomeGuage.labels(ip).set(roombaStatus.going_home);
  iRobotReadyToVacuumGuage.labels(ip).set(roombaStatus.ready_to_vacuum);
}


const server = http.createServer( async (req, res) => {
  getMetrics();
  res.end(await promClient.register.metrics())
});

server.listen(process.env.PORT || 7000);
