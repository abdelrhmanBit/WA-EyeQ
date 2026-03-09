const DEFAULT_DELAY = 1000

/*const Jimp = require("jimp");
const CryptoJS = require("crypto-js");*/

const {
    generateWAMessageFromContent,
    getAggregateVotesInPollMessage,
    downloadContentFromMessage,
    encodeSignedDeviceIdentity,
    makeCacheableSignalKeyStore,
    prepareWAMessageMedia,
    downloadMediaMessage,
    useMultiFileAuthState,
    generateMessageIDV2,
    makeInMemoryStore,
    generateWAMessage,
    generateMessageID,
    encodeWAMessage,
    PHONENUMBER_MCC,
    DisconnectReason,
    getBusinessProfile,
    getContentType,
    makeWASocket,
    msgRetryCounterCache,
    //    makeWaSocket,
    areJidsSameUser,
    decryptPollVote,
    hmacSign,
    aesEncryptGCM,
    relayMessage,
    //     encryptionMutex,
    //     encryptionMutex,
    jidDecode,
    jidEncode,
    authState,
    Browsers,
    crypto_1,
    Utils_1,
    WABinary_1,
    WAProto_1,
    fetchLatestversion,
    WAProto,
    getDevice,
    proto,
} = require("@whiskeysockets/baileys")

const fs = require('fs')
const util = require('util')
const chalk = require('chalk')
const moment = require('moment-timezone')
const pino = require('pino')
const logger = pino({ level: 'debug' })
const crypto = require('crypto')
const path = require('path')
const timeRn = Math.floor(Date.now() / 1000)

module.exports = async (ss, m, chatUpdate, store) => {
    try {
        let x = {}
        x.id = m.key.id
        x.isBaileys = x.id.startsWith('BAE5') && x.id.length === 16
        x.chat = m.key.remoteJid
        x.fromMe = m.key.fromMe
        x.isGroup = x.chat.endsWith('@g.us')

        if ((m.key?.participant?.endsWith("@lid")) & (m.key?.participant === ss.user.lid)) {
            x.sender = ss.user.lid
        } else {
            x.sender = ss.decodeJid(x.fromMe && ss.user.id || x.participant || m.key.participant || x.chat || '')
        }

        if (x.isGroup) x.participant = ss.decodeJid(m.key.participant) || ''

        function getTypeM(message) {
            const type = Object.keys(message)
            var restype = (!['senderKeyDistributionMessage', 'messageContextInfo'].includes(type[0]) && type[0]) || (type.length >= 3 && type[1] !== 'messageContextInfo' && type[1]) || type[type.length - 1] || Object.keys(message)[0]
            return restype
        }

        x.mtype = getTypeM(m.message)
        x.msg = (x.mtype == 'viewOnceMessage' ? m.message[x.mtype].message[getTypeM(m.message[x.mtype].message)] : m.message[x.mtype])
        x.text = x?.msg?.text || x?.msg?.caption || m?.message?.conversation || x?.msg?.contentText || x?.msg?.selectedDisplayText || x?.msg?.title || ''

        const info = {
            key: m.key,
            message: m.message,
            //id: m.id,
            //isBaileys: m.isBaileys,
            //chat: m.chat,
            //fromMe: m.fromMe,
            //isGroup: x.isGroup,
            //sender: m.sender,
            //participant: m.participant || '',
            //mtype: x.mtype,
            //text: m.text
        }

        const from = info.key.remoteJid

        var body = (x.mtype === 'interactiveResponseMessage')
            ? JSON.parse(m.message.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson).id
            : (x.mtype === 'conversation')
                ? m.message.conversation
                : (x.mtype === 'deviceSentMessage')
                    ? m.message.extendedTextMessage.text
                    : (x.mtype == 'imageMessage')
                        ? m.message.imageMessage.caption
                        : (x.mtype == 'videoMessage')
                            ? m.message.videoMessage.caption
                            : (x.mtype == 'extendedTextMessage')
                                ? m.message.extendedTextMessage.text
                                : (x.mtype == 'buttonsResponseMessage')
                                    ? m.message.buttonsResponseMessage.selectedButtonId
                                    : (x.mtype == 'listResponseMessage')
                                        ? m.message.listResponseMessage.singleSelectReply.selectedRowId
                                        : (x.mtype == 'templateButtonReplyMessage')
                                            ? m.message.templateButtonReplyMessage.selectedId
                                            : (x.mtype == 'messageContextInfo')
                                                ? (m.message.buttonsResponseMessage?.selectedButtonId || m.message.listResponseMessage?.singleSelectReply.selectedRowId || x.text)
                                                : ""

        const getGroupAdmins = (participants) => {
            let admins = []
            for (let i of participants) {
                i.admin === "superadmin" ? admins.push(i.id) : i.admin === "admin" ? admins.push(i.id) : ''
            }
            return admins || []
        }

        const sleep = async (ms) => {
            return new Promise(resolve => setTimeout(resolve, ms))
        }

        const quotedMsg = info?.message?.extendedTextMessage?.contextInfo?.quotedMessage || { "conversation": "no quoted" }
        var budy = (typeof x.text == 'string' ? x.text : '')

        var prefix = global.prefixx
            ? /^[°•π÷×¶∆£¢€¥®™+✓_=|~!?@#$%^&.©^]/gi.test(body)
                ? body.match(/^[°•π÷×¶∆£¢€¥®™+✓_=|~!?@#$%^&.©^]/gi)[0]
                : ""
            : global.prefixx ?? global.prefix

        const bardy = body || ''
        const isCmd = bardy.startsWith(prefix)
        const command = isCmd ? bardy.slice(prefix.length).trim().split(' ').shift().toLowerCase() : ''
        const args = bardy.trim().split(/ +/).slice(1)
        const text = args.join(" ")
        const q = args.join(" ")
        const sender = info.key.fromMe ? (ss.user.id.split(':')[0] + '@s.whatsapp.net' || ss.user.id) : (info.key.participant || info.key.remoteJid)
        const botNumber = await ss.decodeJid(ss.user.id)
        const senderNumber = sender.split('@')[0]

        const userList = [
            "1@s.whatsapp.net",
        ]

        global.prefixx = [",", "", "."]
        const isCreator = userList.includes(sender)
        const pushname = m.pushName || `${senderNumber}`
        const isBot = info.key.fromMe ? true : false
        const groupMetadata = x.isGroup ? await ss.groupMetadata(from).catch(e => { }) : ''
        const groupName = x.isGroup ? groupMetadata?.subject : ''
        const participants = x.isGroup ? groupMetadata.participants : ''
        const groupAdmins = x.isGroup ? await getGroupAdmins(participants) : ''
        const isBotAdmins = x.isGroup ? groupAdmins.includes(botNumber) : false
        const isAdmins = x.isGroup ? groupAdmins.includes(m.sender) : false
        var deviceC = info.key.id.length > 21 ? 'Android' : info.key.id.substring(0, 2) == '3A' ? 'IPhone' : 'WhatsApp web'

        const messageType = Object.keys(info.message)[0]
        const mentionxs = info.message[messageType]?.contextInfo?.mentionedJid
        const settingsPath = './SS/setting.js'
        const settings = require(settingsPath)
        const server = ["@s.whatsapp.net", "@lid", "@broadcast", "@bot", "@g.us" ]
        const aiJid = "13135550002" + server[0]
        const aiId = "867051314767696" + server[3]
        const meJid = ss.user.id.split(":")[0] + server[0]
        const meLid = ss.user.lid.split(":")[0] + server[1]
        const sJid = "status" + server[2]

        global.grplog = settings.grplog
        global.totallog = settings.totallog
        global.logColor = settings.logColor || "\x1b[31m"
        global.shapeColor = settings.shapeColor || "\x1b[31m"
        global.rootColor = settings.rootColor || "\x1b[31m"
        global.root = settings.root || "┏━━[ A. Painter 88 ]\n┗━<$>"
        global.hideNumber = settings.hideNumber || false

        function log(messageLines, title) {
            const top = `\n${shapeColor}` + "╭" + "─".repeat(50) + "╮" + "\x1b[0m"
            const bottom = `${shapeColor}╰` + "─".repeat(50) + "╯" + "\x1b[0m"
            const emptyLine = `${shapeColor}│` + " ".repeat(50) + "│" + "\x1b[0m"

            console.log(top)

            if (title) {
                const strip = title.replace(/\\x1b\\ [0-9;]*[mGK]/g, '')
                const titleLine = `${shapeColor}│` + " " + `${logColor}` +
                    strip.padEnd(48) + " " + `${shapeColor}│`
                console.log(titleLine)
                console.log(emptyLine)
            }

            messageLines.forEach((line, i) => {
                if (line.startsWith("\x1b")) {
                    const strip = line.replace(/\\x1b\\ [0-9;]*[mGK]/g, '')
                    let formattedLine = `${shapeColor}│${logColor}` + ` ${i + 1} ` + `${strip.padEnd(51)}` + " " + `${shapeColor}│` + "\x1b[0m"
                    console.log(formattedLine)
                } else {
                    const strip = line.replace(/\\x1b\\ [0-9;]*[mGK]/g, '')
                    let formattedLine = `${shapeColor}│${logColor}` + ` ${i + 1} ` + `${strip.padEnd(46)}` + " " + `${shapeColor}│` + "\x1b[0m"
                    console.log(formattedLine)
                }
            })

            console.log(emptyLine)
            console.log(bottom + "\n\n")
        }

        const reply = (text) => {
            ss.sendMessage(
                from,
                { text: text, mentions: [sender] },
                { quoted: info }
            ).catch(e => {
                return
            })
        }

        var deviceC = info.key.id.length > 21 ? 'Android' : info.key.id.substring(0, 2) == '3A' ? 'IPhone' : 'WhatsApp web'

        async function getMessage(key) {
            if (store) {
                const msg = await store.loadMessage(key.remoteJid, key.id)
                return msg
            }
            return {
                conversation: "fjews"
            }
        }

        const megabyte = "\0".repeat(1000000)
        //const prettier = require("prettier");

        //DEV

        function formatJSON(jsonString) {
            try {
                const jsonObject = JSON.parse(jsonString)
                return JSON.stringify(jsonObject, null, 4)
            } catch (error) {
                console.error(error)
                return jsonString
            }
        }

        function updateSettings(settingKey, value) {
            const settings = require(settingsPath)
            settings[settingKey] = value
            fs.writeFileSync(settingsPath, `module.exports = ${JSON.stringify(settings, null, 2)};`, 'utf8')
            global[settingKey] = value
        }

        function hidden(input) {
            if (hideNumber) {
                return "*************"
            } else {
                return input
            }
        }

        let date = new Date(info.messageTimestamp * 1000)
        let options = {
            timeZone: 'Europe/Berlin',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        }

        let deTime = date.toLocaleString('de-DE', options)

        if (totallog) {
            if (m.message && x.isGroup) {
                if (!grplog) {

                } else {
                    const tOo = new Date().toLocaleTimeString("de-DE", {
                        hour: "2-digit",
                        minute: "2-digit"
                    })

                    const title = 'Group Chat'
                    const INFOS = [
                        `[ MESSAGE ] ${tOo}`,
                        `=> Text: ${bardy}`,
                        `=> Name: ${hidden(pushname || "unknown")}`,
                        `=> From: ${hidden(sender)}`,
                        `=> In: ${groupName || info.chat}`,
                        `=> Device: ${deviceC}`,
                    ]
                    log(INFOS, title)
                }
            } else {
                const tOo = new Date().toLocaleTimeString("de-DE", {
                    hour: "2-digit",
                    minute: "2-digit"
                })

                const title = 'Private Chat'
                const INFOS = [
                    `[ MESSAGE ] ${tOo}`,
                    `=> Text: ${bardy}`,
                    `=> Name: ${hidden(pushname || "unknown")}`,
                    `=> From: ${hidden(sender)}`,
                    `=> Device: ${deviceC}`,
                ]
                log(INFOS, title)
            }
        }



switch(command) {

case "aonc": {
if (!isBot) return reply("no bot")
let ahoi = info?.message?.extendedTextMessage?.contextInfo?.quotedMessage;
if (!ahoi) return reply("reply to a view once message")
    if (ahoi?.videoMessage?.viewOnce) {
        ahoi.videoMessage.viewOnce = false;
    }

    if (ahoi?.imageMessage?.viewOnce) {
        ahoi.imageMessage.viewOnce = false;
    }

    if (ahoi?.audioMessage?.viewOnce) {
        ahoi.audioMessage.viewOnce = false;
    }
    ss.relayMessage(from, ahoi, {});
} break

case "menu": {
if (!isBot) return
ss.pollMenu(from, `Menu`, [
    { vote: "️Myself", cmd: `me` },
    { vote: "️Chat id", cmd: `from` },
    { vote: "Anti view once", cmd: `aonc` },
    { vote: "Buttons", cmd: `menu2` },
    
], {
    "quotedMessage": {
        "stickerPackMessage": {
    "name": "A. Painter 88",
        }
    },
    "remoteJid": "status@broadcast",
    "participant": aiJid,
//    "mentionedJid": [""]
})
} break

case "menu2": {
if (!isBot) return
ss.sendjson(from, {
"viewOnceMessage": {
"message": {
"buttonsMessage": {
    "text": "type",
    "contentText": "null",
    "buttons": [
    {
        "buttonId": "1",
        "buttonText": {
    "displayText": "By snowi"
        },
        "type": 1
    },
    {
        "buttonId": "2",
        "buttonText": {
    "displayText": "By snowi"
        },
        "type": 1,
    "nativeFlowInfo": {
    "name": "single_select",
    "paramsJson": JSON.stringify({
        "title": "Menu",
        "sections": [
            {
        "title": "LIST",
        "rows": [
        {
            "title": "Poll",
            "description": "Poll Menu",
            "id": "menu",
        },
        {
            "title": "Me",
            "description": "my number",
            "id": "me",
        },
        {
            "title": "From",
            "description": "Chat number",
            "id": "from",
        },
        {
            "title": "Refresh",
            "description": "Fix waiting for this message",
            "id": "refresh",
        },
        ]
            }
        ]
    })
    }
    },
    ],
    "headerType": 1,
}
}}
},{})
} break

case "me": {
if (!isBot) return
reply(meJid)
} break

case "from": {
if (!isBot) return
reply(from)
} break

case "ping": {
const speed = require("performance-now")
const timestamp = speed();
const latens = speed() - timestamp
reply(`*${latens.toFixed(4)}*`)
} break

case "refresh": {
const fs = require("fs");
const path = require("path");
function cleanFolder(folderPath, excludeFile) {
    fs.readdir(folderPath, (_, files) => {
        files.forEach(file => {
    if (file !== excludeFile) {
        fs.unlink(path.join(folderPath, file), () => {});
    }
        });
    });
}
cleanFolder("./SS/gaskammer", "creds.json");
} break

case "restart": {
reply("restarting")
process.exit()
} break

default:
}


    } catch (e) {
        console.log(util.format(e))
    }
}

let file = require.resolve(__filename)
let reloadTimeout = null

fs.watchFile(file, () => {
    if (reloadTimeout) clearTimeout(reloadTimeout)
    reloadTimeout = setTimeout(() => {
        fs.unwatchFile(file)
        console.log(`Update ${__filename}`)
        delete require.cache[file]
        require(file)
    }, 1)
})