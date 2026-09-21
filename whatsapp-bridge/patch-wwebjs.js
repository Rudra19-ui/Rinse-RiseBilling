/**
 * Patch whatsapp-web.js contact getters that crash on newer WhatsApp Web (LID/memoize errors).
 * Safe to run multiple times (postinstall / Docker build).
 */
const fs = require("fs");
const path = require("path");

const utilsPath = path.join(__dirname, "node_modules", "whatsapp-web.js", "src", "util", "Injected", "Utils.js");

if (!fs.existsSync(utilsPath)) {
  console.warn("[patch-wwebjs] whatsapp-web.js Utils.js not found — skip");
  process.exit(0);
}

let src = fs.readFileSync(utilsPath, "utf8");
if (src.includes("PATCHED_CONTACT_GETTER_GUARD")) {
  console.log("[patch-wwebjs] Already patched");
  process.exit(0);
}

const oldGetContact = `    window.WWebJS.getContact = async (contactId) => {
        const contactWid = window
            .require('WAWebWidFactory')
            .createWid(contactId);
        const contact = await window
            .require('WAWebCollections')
            .Contact.find(contactWid);
        if (contact.isBusiness || contact.isEnterprise) {
            const bizProfile = await window
                .require('WAWebCollections')
                .BusinessProfile.find(contactWid);
            bizProfile.profileOptions && (contact.businessProfile = bizProfile);
        }
        return window.WWebJS.getContactModel(contact);
    };`;

const newGetContact = `    window.WWebJS.getContact = async (contactId) => {
        /* PATCHED_CONTACT_GETTER_GUARD */
        const contactWid = window.require('WAWebWidFactory').createWid(contactId);
        let contact = window.require('WAWebCollections').Contact.get(contactWid);
        if (!contact) {
            try {
                contact = await window.require('WAWebCollections').Contact.find(contactWid);
            } catch {
                contact = null;
            }
        }
        if (!contact || !contact.id) return null;
        if (contact.isBusiness || contact.isEnterprise) {
            try {
                const bizProfile = await window
                    .require('WAWebCollections')
                    .BusinessProfile.find(contactWid);
                if (bizProfile?.profileOptions) contact.businessProfile = bizProfile;
            } catch {
                /* non-business or lookup failed */
            }
        }
        return window.WWebJS.getContactModel(contact);
    };`;

const oldGetContactModelStart = `    window.WWebJS.getContactModel = (contact) => {
        let res = contact.serialize();

        const wid = window
            .require('WAWebWidFactory')
            .createWidFromWidLike(contact.id);
        if (wid.isLid() && contact.phoneNumber) {
            res.id = contact.phoneNumber;
        }`;

const newGetContactModelStart = `    window.WWebJS.getContactModel = (contact) => {
        /* PATCHED_CONTACT_GETTER_GUARD */
        if (!contact || !contact.id) {
            return {
                id: { _serialized: '0@c.us', user: '0', server: 'c.us' },
                number: '',
                name: '',
                shortName: '',
                pushname: '',
                isMe: false,
                isUser: false,
                isGroup: false,
                isWAContact: false,
                isMyContact: false,
                isBusiness: false,
                isEnterprise: false,
                isBlocked: false,
            };
        }
        let res = contact.serialize();
        const wid = window.require('WAWebWidFactory').createWidFromWidLike(contact.id);
        if (wid?.isLid?.() && contact.phoneNumber) {
            res.id = contact.phoneNumber;
        }`;

if (!src.includes(oldGetContact)) {
  console.warn("[patch-wwebjs] getContact block not found — library version may differ");
  process.exit(0);
}

src = src.replace(oldGetContact, newGetContact);
if (src.includes(oldGetContactModelStart)) {
  src = src.replace(oldGetContactModelStart, newGetContactModelStart);
} else {
  console.warn("[patch-wwebjs] getContactModel block not found — partial patch only");
}

fs.writeFileSync(utilsPath, src, "utf8");
console.log("[patch-wwebjs] Patched contact getters in Utils.js");
