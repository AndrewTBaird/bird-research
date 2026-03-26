async function sleep(interval: number) {
    return new Promise(resolve => (setTimeout(resolve, interval)))
}

async function poll() {
    while(true) {
        
        // find queued jobs
        console.log('polling')
        console.log('------')
        await sleep(2000)
    }
}

poll()