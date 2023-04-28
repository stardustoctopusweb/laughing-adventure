/*
const writable = port.writable.getWriter();
    //for (let i = 0; i < 127; i++)
    await writable.write(new Uint8Array([85, 170, /*128* /0, 68, 1, 0]));
    let values = await read(port);
    document.write(values + "\n");

    await writable.write(new Uint8Array([85, 170, /*128* /0, 69, 1, 100]));
    values = await read(port);
    document.write(values + "\n");
*/

var log_count = 0;
function log(message) {
    if (log_count++ > 100) {
        document.querySelector("#console").innerHTML = "";
        log_count = 0;
    }
    const elem = document.createElement("p");
    elem.innerText = "" + message;
    document.querySelector("#console").appendChild(elem);
    document.querySelector("#console").scrollTop = document.querySelector("#console").scrollHeight;
}

async function read(port) {
    const readable = port.readable.getReader();
    let values = new Array();

    const {value, done} = await readable.read();
    values.push(value);
    if (!done) {
        let d = false;
        while (!d) {
            let timeout = setTimeout(()=>{readable.cancel(); readable.releaseLock();}, 150);
            try {
                let {_v, _d} = await readable.read();
                //alert("read again! " + _d);
                d = _d;
                values.push(_v);
            } catch (e) {
                //alert(e);
                break;
            }
            clearTimeout(timeout);
        }
    }
    return values;
}

async function write8(port, register, value) {
    const writer = port.writable.getWriter();
    log("[write8] writing " + value + " to " + register + "...");
    await writer.write(new Uint8Array([85, 170, 0, register, 1, value]));
    writer.releaseLock();
}

async function sendKeepalive(port) {
    const writer = port.writable.getWriter();
    log("[sendKeepalive] Sending keepalive...");
    await writer.write(new Uint8Array([85, 170, 128, 255, 1]));
    writer.releaseLock();
}

async function sleep(ms) {
    return new Promise((resolve, reject)=>{
        setTimeout(resolve, ms);
    });
}

async function _run() {
    let stream = await navigator.mediaDevices.getUserMedia({audio: false, video:true});
    document.querySelector("video").srcObject = stream;
    document.querySelector("video").play();
}

async function run() {
    try {
    log("opening port...");
    const port = await navigator.serial.requestPort();
    await port.open({baudRate: 250_000});
    
    //write8(port, )
    //write8(port, 72, 255-86);

    log("Writing to registers...");
    await write8(port, 72, 0);
    await write8(port, 68, 123);

    //await write8(port, 67, 256-10); // down: 10 up: 256-10

    //write8(port, 68, 0);
    //await write8(port, 68, 0);
    //await write8(port, 69, 20);

    await write8(port, 71, 0);
    //await write8(port, 70, 256-20);
    
    //log( await read(port) );

    //await sleep(1000000);

    //alert("written!");

    let position = 0;

    var is_claw_closed = false;
    var lift_power = 0;
    var gamepad;
    var loop_count = 0;
    var x_power = 0;
    setInterval(async ()=>{
        try {
            let elem = document.querySelector("#buttons");
            let out = "Gamepad:\n";
            //log(navigator.getGamepads());
            if (navigator.getGamepads().length > 0) {
                if (true || !gamepad) {
                gamepad = navigator.getGamepads()[0];
                }

                gamepad.buttons.forEach((button, i)=>{
                    out += "Button " + i + ": " + button.pressed + "\n";
                });

                elem.innerText = "placeholder";
                elem.innerText = out;

                //log(gamepad.buttons);
                if (gamepad.buttons[1].pressed && !is_claw_closed) {
                    log("[gamepad] closing claw");
                    is_claw_closed = true;
                    await write8(port, 66, 5);
                    log("[gamepad] Done!");
                } else if ((!gamepad.buttons[1].pressed) && is_claw_closed) {
                    log("[gamepad] opening claw");
                    is_claw_closed = false;
                    await write8(port, 66, 100);
                    log("[gamepad] Done!");
                }

                const CR_STOP = 123;
                if (gamepad.buttons[4].pressed && lift_power != 256-10) {
                    log("[gamepad] raising lift!");
                    lift_power = 256-10;
                    await write8(port, 67, lift_power);
                    log("[gamepad] done!");
                } else if (gamepad.buttons[5].pressed && lift_power != 10) {
                    log("[gamepad] lowering lift!");
                    lift_power = 10;
                    await write8(port, 67, lift_power);
                    log("[gamepad] done!");
                } else if (!gamepad.buttons[4].pressed && !gamepad.buttons[5].pressed && lift_power != CR_STOP) {
                    log("[gamepad] stopping lift!");
                    lift_power = CR_STOP;
                    await write8(port, 67, lift_power);
                    log("[gamepad] Done!");
                }
                
                const X_STOP = 128
                if (gamepad.buttons[14].pressed && x_power != 256-10) {
                    log("[gamepad] raising x!");
                    x_power = 256-10;
                    await write8(port, 68, x_power);
                    log("[gamepad] done!");
                } else if (gamepad.buttons[15].pressed && x_power != 10) {
                    log("[gamepad] lowering x!");
                    x_power = 10;
                    await write8(port, 68, x_power);
                    log("[gamepad] done!");
                } else if (!gamepad.buttons[14].pressed && !gamepad.buttons[15].pressed && x_power != X_STOP) {
                    log("[gamepad] stopping x!");
                    x_power = X_STOP;
                    await write8(port, 68, x_power);
                    log("[gamepad] Done!");
                }//14 and 15

                const Z_STOP = 123
                let z_power;
                if (gamepad.buttons[12].pressed && z_power != 256-10) {
                    log("[gamepad] raising z!");
                    z_power = 256-10;
                    await write8(port, 69, 256-z_power);
                    await write8(port, 70, z_power);
                    log("[gamepad] done!");
                } else if (gamepad.buttons[13].pressed && z_power != 10) {
                    log("[gamepad] lowering z!");
                    z_power = 10;
                    await write8(port, 69, 256-z_power);
                    await write8(port, 70, z_power);
                    log("[gamepad] done!");
                } else if (!gamepad.buttons[12].pressed && !gamepad.buttons[13].pressed && z_power != Z_STOP) {
                    log("[gamepad] stopping z!");
                    z_power = Z_STOP;
                    await write8(port, 69, z_power);
                    await write8(port, 70, z_power);
                    log("[gamepad] Done!");
                }//12 and 13

            }
        } catch (e) {
            log(e);
        }
    }, 100)


    // send keepalive type thing idk (tries to read from probably invalid location)
    let interval = setInterval(async()=>{
        try {
            await sendKeepalive(port);
        } catch (E) {
            log(E);
        }
    }, 1000);

    //alert(done);
    //readable.releaseLock();

    //document.write(values);

    /*setTimeout(()=>{
        log("closing normally!!");
        //write8(port, 69, 0);
        //write8(port, 66, 128);
        log( read(port) ); 
        clearInterval(interval); 
        //writable.releaseLock(); 
        port.close();
    }, 20_000);*/
    } catch (e) {
        log("closing");
        log(e);
    }
}