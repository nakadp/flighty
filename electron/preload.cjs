const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    getFlights: () => ipcRenderer.invoke('db:getFlights'),
    addFlight: (flight) => ipcRenderer.invoke('db:addFlight', flight),
    deleteFlight: (id) => ipcRenderer.invoke('db:deleteFlight', id),
    updateFlight: (flight) => ipcRenderer.invoke('db:updateFlight', flight)
});
