const mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1/perfData', { useNewUrlParser: true, useUnifiedTopology: true });
const Machine = require('./models/Machine');

const socketMain = (io, socket) => {
    // console.log("A socket connected!", socket.id)
    let macA;

    socket.on('clientAuth', (key) => {
        if (key === 'ayeayesir123') {
            // valid nodeClient
            socket.join('clients');
        } else if (key === 'uiuisir123') {
            // valid ui client has joined
            socket.join('ui');
            console.log("A react client has joined!")
        } else {
            // an invalid client has joined. Goodbye
            socket.disconnect(true);
        }
    })

    // a machine has connected, check to see if it's new.
    // if it is, add it!
    socket.on('initPerfData', async(data) => {
        // update our socket connect function scoped variable
        macA = data.macA;
        // now go check mongo
        const mongooseResponse = checkAndAdd(data);
        console.log(mongooseResponse);
    });

    socket.on('perfData', (data) => {
        console.log("Tick...");
        io.to('ui').emit('data', data);
    });
}

const checkAndAdd = (data) => {
    // because we are doing db stuff, js wont wait for the db
    // so we need to make this a promise
    return new Promise((resolve, reject) => {
        Machine.findOne(
            { macA: data.macA },
            (err, doc) => {
                if (err) {
                    throw err;
                    reject(err);
                } else if (doc === null) {
                    // these are the droids we're lookung for!
                    //  the record is not in the db, so add it!
                    let newMachine = new Machine(data);
                    newMachine.save();
                    resolve('added');
                    console.log("added", doc);
                } else {
                    // it is in the db. just resolve
                    resolve('found');
                    console.log("found", doc);
                }
            }
        );
    });

}

module.exports = socketMain;