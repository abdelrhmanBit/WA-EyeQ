const {
    fs,
    util,
    chalk,
    moment,
    pino,
    logger,
    crypto,
    path,
    readline,
    yargs,
    _,
    Boom,
    sleep,
    store,
    rl,
    question,
    makeWASocket,
    generateWAMessageFromContent,
    getAggregateVotesInPollMessage,
    downloadContentFromMessage,
    useMultiFileAuthState,
    generateWAMessage,
    DisconnectReason,
    prepareWAMessageMedia,
    areJidsSameUser,
    getContentType,
    decryptPollVote,
    relayMessage,
    jidDecode,
    MakeInMemoryStore,
    Browsers,
    proto
} = require('./consts.js')

let qrBool = false
let bross

if (qrBool) {
    bross = ["TsM Console", "IOS_CATALYST", "24.04.1"]
} else {
    bross = Browsers.ubuntu("safari")
}

const { fetchLatestWaWebVersion } = require("@whiskeysockets/baileys")

//━━━━━━━━━By ssnowi━━━━━━━━━━━━━━━
// dont change Something is you dont know how

const NodeCache = require('node-cache')
const groupCache = new NodeCache({ stdTTL: 300, useClones: false })
const settingsPath = './setting.js'
const settings = require(settingsPath)

global.rootColor = settings.rootColor || '\x1b[31m'
global.root = settings.root || ":[ C.M.D ]: "
global.hideNumber = settings.hideNumber || false

//const qrcode = require("qrcode-terminal")
//let bross = Browsers.ubuntu("Safari")

let menuActive = false

async function startPrompt(ss) {
    const originalLog = console.log
    let logTimeout = null
    let promptTimeout = null

    console.log = (...args) => {
        if (!logTimeout) {
            process.stdout.write('\n\n')
        }

        originalLog(...args)

        if (logTimeout) clearTimeout(logTimeout)

        logTimeout = setTimeout(() => {
            process.stdout.write('\n\n')
            logTimeout = null

            if (!menuActive) {
                if (promptTimeout) clearTimeout(promptTimeout)
                promptTimeout = setTimeout(() => {
                    setRedPrompt(rootColor, root)
                }, 50)
            }
        }, 50)
    }

    function setRedPrompt(COLOR, PROMT) {
        if (!menuActive) {
            process.stdout.write(COLOR)
            rl.setPrompt(`\n${COLOR}${PROMT}`)
            rl.prompt()
        }
    }

    setRedPrompt(rootColor, root)

    rl.on('line', (input) => {
        if (menuActive) return

        const command = input.trim()

        if (command.startsWith(",")) {
            menuActive = true
            require("./cmd")(command, ss, rl, () => {
                menuActive = false
                setRedPrompt(rootColor, root)
            })
        } else {
            const m = {
                key: {
                    remoteJid: ss.user.lid,
                    id: "ss"
                },
                sender: ss.user.lid
            }

            ss.makeFakeCommand(m, command)
        }
    })
}

const dir = (relPath) => path.join(__dirname, relPath)

global.opts = new Object(
    yargs(process.argv.slice(2))
        .exitProcess(false)
        .parse()
)

async function ssStart() {
    const { version, isLatest } = await fetchLatestWaWebVersion()
    const { state, saveCreds } = await useMultiFileAuthState(dir("/gaskammer"))

    const ss = makeWASocket({
        logger: pino({ level: "silent" }),
        breakprintQRInTerminal: false,
        markOnlineOnConnect: qrBool,
        auth: state,
        cachedGroupMetadata: async (jid) => groupCache.get(jid),
        emitOwnEvents: true,
        printQRInTerminal: qrBool,
        browser: ["Ubuntu", "Chrome", "20.0.00"],
        patchMessageBeforeSending: (msg) => {

            function self(msg) {
                /*
                const im = msg?.interactiveMessage
                || msg?.message?.interactiveMessage
                || msg?.viewOnceMessage?.message?.interactiveMessage
                || Object.values(msg || {}).find(v => v?.message?.interactiveMessage)?.message?.interactiveMessage
                */

                const im = msg?.interactiveMessage
                    || msg?.message?.interactiveMessage
                    || Object.values(msg || {}).find(v => v?.message?.interactiveMessage)?.message?.interactiveMessage

                const c = !!im?.carouselMessage?.cards?.every(i => i?.nativeFlowMessage?.buttons)

                if (!im?.nativeFlowMessage?.buttons && !c) return msg

                const obj = { name: "cta_url", buttonParamsJson: "" }

                const ctaify = but =>
                    Array.isArray(but)
                        ? but.flatMap(b =>
                            !b?.buttonParamsJson
                                ? []
                                : b?.name?.toLowerCase?.().includes("cta_url")
                                    ? [b]
                                    : [obj, b]
                        )
                        : but

                if (im?.nativeFlowMessage?.buttons)
                    im.nativeFlowMessage.buttons = ctaify(im.nativeFlowMessage.buttons)

                if (c)
                    for (const card of im.carouselMessage.cards)
                        if (Array.isArray(card.nativeFlowMessage?.buttons))
                            card.nativeFlowMessage.buttons = ctaify(card.nativeFlowMessage.buttons)

                return msg
            }

            msg = self(msg)

            /*
            const xproto = require('./proto')
            const zmen = xproto.proto.Message.fromObject(msg)
            const enc = xproto.proto.Message.encode(zmen).finish()
            const dec = proto.Message.decode(enc)
            msg = dec
            */

            const requiresPatch = !!(
                msg.buttonsMessage ||
                msg.templateMessage ||
                msg.listMessage
            )

            if (requiresPatch) {
                msg = {
                    viewOnceMessage: {
                        message: {
                            ...msg
                        }
                    }
                }
            }

            return msg
        },
        getMessage: async (key) => {
            if (store) {
                const msg = await store.loadMessage(key.remoteJid, key.id)
                //console.log(JSON.stringify(msg, null, 4))
                return msg?.message || msg
            }
            return {
                conversation: "null"
            }
        },
        shouldSyncHistoryMessage: msg => {
            return !!msg.syncType
        },
        version: [2, 3000, 1028395461],
    }, store)

    ss.mainPath = __dirname
    Object.assign(ss, require('./functions.js'))

    if (!ss.authState.creds.registered & !qrBool) {
        const phoneNumber = await question('Enter number: ')
        let code = await ss.requestPairingCode(
            phoneNumber.replace(/[^\d]/g, ''),
            "AAAAAAAA"
        )
        code = code?.match(/.{1,4}/g)?.join("-") || code
        console.log(`code :`, code)
    }

    store.bind(ss.ev)

    ss.ev.on('messages.upsert', async chatUpdate => {
        try {
            update = chatUpdate.messages[0]
            if (!update.message) return

            update.message =
                (Object.keys(update.message)[0] === 'ephemeralMessage')
                    ? update.message.ephemeralMessage.message
                    : update.message

            //if (update.key.id.startsWith('3EB0')) return

            if (update) {
                function b2b64(obj) {
                    /*
                    if (!obj || typeof obj !== 'object') return obj
                    if (Buffer.isBuffer(obj)) return obj.toString('base64')
                    if (obj.type === 'Buffer' && Array.isArray(obj.data)) return Buffer.from(obj.data).toString('base64')
                    for (const k in obj) obj[k] = b2b64(obj[k])
                    */
                    return obj
                }

                m = { ...update }
                m = b2b64(m)

                require("../271k.js")(ss, m, chatUpdate, store)
            }

            if (m?.message?.pollUpdateMessage) {
                m = { ...update }
                require("./poll.js")(ss, m)
            }

        } catch (err) {
            console.log(err)
        }
    })

    ss.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update

        if (connection) connectionStatus = connection

        if (connection === 'close') {
            const reason = new Boom(lastDisconnect?.error)?.output?.statusCode

            switch (reason) {
                case DisconnectReason.badSession:
                    console.error('Bad session file. Deleting session and reconnecting...')
                    //fs.rmSync(dir('/session'), { recursive: true, force: true })
                    //ssStart()
                    process.exit()
                    break

                case DisconnectReason.connectionClosed:
                case DisconnectReason.connectionLost:
                case DisconnectReason.timedOut:
                    console.warn('Connection closed. Reconnecting...')
                    ssStart()
                    break

                case DisconnectReason.loggedOut:
                    console.error('Disconnected. Delete the session and run the script again.')
                    fs.rmSync(dir('/gaskammer'), { recursive: true, force: true })
                    ssStart()
                    break

                case DisconnectReason.restartRequired:
                    console.log('Reboot required. Reconnecting..')
                    ssStart()
                    break

                case DisconnectReason.forbidden:
                    fs.rmSync(dir('/gaskammer'), { recursive: true, force: true })
                    ssStart()
                    break

                default:
                    console.error(`Unknown disconnect reason: ${reason}. Reconnecting...`)
                    ssStart()
                    break
            }
        } else if (connection === 'open') {

            function hidden(input) {
                if (hideNumber) {
                    return "*************"
                } else {
                    return input
                }
            }

            console.clear
            centerLog(fs.readFileSync(dir('./penis.log'), 'utf-8'), chalk.green)

            console.log('\n\n')
            await sleep(1000)

            console.log(chalk.redBright('Connected to WhatsApp successfully!'))
            console.log(chalk.redBright(hidden(ss.user.id || '👁️')))
            console.log("\n")
            console.log("You may need to send a message in whatsApp first before the internal cmd works")
            ss.ev.on('messages.update', async (chatUpdate) => {
                for (const { key, update } of chatUpdate) {
                    if (update.pollUpdates && key.fromMe) {
                        const pollCreation = await ss.getMessage(key)

                        if (pollCreation) {
                            let pollUpdate = await getAggregateVotesInPollMessage({
                                message: pollCreation?.message?.botInvokeMessage?.message || pollCreation?.message,
                                pollUpdates: update.pollUpdates,
                            })

                            //           console.log(JSON.stringify(chatUpdate, null, 4))

                            let selectedOptionName = pollUpdate.filter(v => v.voters.length !== 0)[0]?.name

                            const selectedCmd = ss.tempPollStore
                                .find(item => item.id === key.id)
                                ?.cmds.find(c => c.vote === selectedOptionName)
                                ?.cmd

                            const selectedCmdx = selectedCmd || selectedOptionName

                            await ss.makeFakeCommand(m, selectedCmdx, chatUpdate)
                        } else {
                            return false
                        }

                        return
                    }
                }
            })

            startPrompt(ss)
        }
    })

    ss.ev.on('creds.update', saveCreds)

    async function getMessage(key) {
        if (store) {
            const msg = await store.loadMessage(key.remoteJid, key.id)
            return msg
        }
        return {
            conversation: "undefined",
        }
    }

    function centerLog(text, color = chalk.white) {
        const terminalWidth = process.stdout.columns || 80
        if (text.length >= terminalWidth) return console.log(color(text))
        console.log(color(' '.repeat(Math.max(0, (terminalWidth - text.length) / 2)) + text))
    }

    return ss
}

ssStart()

let file = require.resolve(__filename)

fs.watchFile(file, () => {
    fs.unwatchFile(file)
    console.log(`Update ${__filename}`)
    process.exit()
})