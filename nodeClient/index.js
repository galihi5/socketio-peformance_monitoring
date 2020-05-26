// The node program that captures local performance data
// req:
// -farm hash
// -socket.io-client

//  What do we need to know from node about performance
// - CPU load (current) --> os.loadavg() ga valid
// - Memory usage : total - free
//   - free --> os.freemem()
//   - total --> os.totalmem()
// - OS type --> os.type()
// - Uptime --> os.uptime()
// - CPU info --> os.cpus()
//   - Type --> os.cpus()[0].model
//   - Number of cores --> os.cpus().length
//   - Clock speed --> os.cpus()[0].speed

const os = require('os');
const io = require('socket.io-client');
let socket = io('http://127.0.0.1:8181');

socket.on('connect', () => {
    // console.log('I connected to the socket server... HORE!');
    // we need a way to identify this machine to whomever concerned
    const nI = os.networkInterfaces(); //console.log(nI); //type:object
    let macA;
    // loop through all the nI for this machine and find a non-internal one
    for (let key in nI) {
        nI[key].forEach((niKey) => {
            if (niKey.family.toLowerCase() === 'ipv4' && !niKey.internal) {
                macA = niKey.mac;
            }
        });
        if (macA !== undefined) {
            break;
        }
    }

    // client auth with single key value
    socket.emit('clientAuth', 'ayeayesir123');

    performanceData().then((allPerformanceData) => {
        allPerformanceData.macA = macA;
        socket.emit('initPerfData', allPerformanceData);
    });

    // start sending over data on interval
    let perfDataInterval = setInterval(() => {
        performanceData().then((allPerformanceData) => {
            console.log(allPerformanceData);
            allPerformanceData.macA = macA;
            socket.emit('perfData', allPerformanceData);
        });
    }, 1000);

    socket.on('disconnect', () => {
        clearInterval(perfDataInterval);
    });
})

const performanceData = () => {
    return new Promise(async (resolve, reject) => {
        const freeMem = os.freemem();
        const totalMem = os.totalmem();
        const usedMem = totalMem - freeMem;
        const memUsage = Math.floor(usedMem / totalMem * 100);

        const osType = os.type();
        const upTime = os.uptime();

        const cpus = os.cpus();
        const cpuModel = cpus[0].model;
        const numCores = cpus.length;
        const cpuSpeed = cpus[0].speed;

        const cpuLoad = await getCpuLoad();
        resolve({
            freeMem,
            totalMem,
            usedMem,
            memUsage,
            osType,
            upTime,
            cpuModel,
            numCores,
            cpuSpeed,
            cpuLoad
        })
    });

}

// cpus isa ll cores. we need the average of all the cores whic will give us the cpu average
const cpuAverage = () => {
    const cpus = os.cpus();
    // get ms in each mode, BUT this number is since reboot. so get it now, and get in 100ms compare
    let idleMs = 0;
    let totalMs = 0;

    // loop through each core
    cpus.forEach((aCore) => {
        // loop through each property fof the current core
        for (type in aCore.times) {
            // console.log(type+"\t:"+aCore.times[type]);
            totalMs += aCore.times[type];
        }
        idleMs += aCore.times.idle;
    });

    return {
        idle: idleMs / cpus.length,
        total: totalMs / cpus.length
    }
}

// beacuse the times property is time since boot, we will get now times, and 100ms from now times. Compare them, that will give us current load
const getCpuLoad = () => {
    return new Promise((resolve, reject) => {
        const start = cpuAverage();
        setTimeout(() => {
            const end = cpuAverage();
            const idleDifference = end.idle - start.idle;
            const totalDifference = end.total - start.total;
            // console.log(idleDifference, totalDifference);
            const percentageCpu = 100 - Math.floor(100 * idleDifference / totalDifference);
            // console.log(percentageCpu);
            resolve(percentageCpu);
        }, 100);

    });
}

// console.log(cpuModel+"\t"+cpuCores+"\t"+cpuSpeed)
// console.log(osType);
// console.log(upTime);
// console.log(freeMem);
// console.log(totalMem);
// console.log(usedMem);
// console.log(memUsage);


