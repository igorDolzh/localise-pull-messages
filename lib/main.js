"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_api_1 = require("@lokalise/node-api");
const adm_zip_1 = __importDefault(require("adm-zip"));
const https = __importStar(require("https"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const ghCore = __importStar(require("@actions/core"));
const apiKey = ghCore.getInput("api-token");
const projectId = ghCore.getInput("project-id");
const filePath = ghCore.getInput("file-path");
const downloadOptions = ghCore.getInput("download-options");
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log(apiKey, projectId, filePath, downloadOptions);
        const lokalise = new node_api_1.LokaliseApi({
            apiKey
        });
        const getZipFile = (fileUrl) => {
            return new Promise((resolve, reject) => {
                const req = https.get(fileUrl, (res) => __awaiter(this, void 0, void 0, function* () {
                    const data = [];
                    let dataLen = 0;
                    res.on('data', (chunk) => {
                        data.push(chunk);
                        dataLen += chunk.length;
                    }).on('end', () => __awaiter(this, void 0, void 0, function* () {
                        try {
                            const buf = Buffer.alloc(dataLen);
                            for (let i = 0, len = data.length, pos = 0; i < len; i++) {
                                data[i].copy(buf, pos);
                                pos += data[i].length;
                            }
                            const zip = new adm_zip_1.default(buf);
                            resolve(zip);
                        }
                        catch (e) {
                            reject(e);
                        }
                    }));
                }));
                req.on('error', (err) => {
                    reject(err);
                });
            });
        };
        const writeFileRecursive = (file, data) => {
            const dirname = path.dirname(file);
            if (!fs.existsSync(dirname)) {
                fs.mkdirSync(dirname, { recursive: true });
            }
            fs.writeFileSync(file, data);
        };
        let options = {};
        try {
            options = downloadOptions ? JSON.parse(downloadOptions) : {};
        }
        catch (_a) {
            options = {};
        }
        const file = yield lokalise.files.download(projectId, Object.assign({ format: 'json', original_filenames: false, bundle_structure: filePath, export_sort: 'first_added', replace_breaks: false }, options));
        const zip = yield getZipFile(file.bundle_url);
        const zipEntries = zip.getEntries();
        for (let i = 0; i < zipEntries.length; i++) {
            console.log(zipEntries[i].entryName);
            if (zipEntries[i].entryName.match(/[a-z]*\.[a-z]*$/)) {
                console.log(zipEntries[i].entryName);
                try {
                    writeFileRecursive(zipEntries[i].entryName, zip.readAsText(zipEntries[i]));
                }
                catch (err) {
                    console.log(`ERROR for ${zipEntries[i].entryName}`);
                    console.log(err);
                }
            }
        }
    });
}
run();
