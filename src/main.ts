import {LokaliseApi, DownloadFileParams, Keyable} from '@lokalise/node-api'
import AdmZip from 'adm-zip'
import * as https from 'https'
import * as fs from 'fs'

import * as ghCore from "@actions/core";

const apiKey = ghCore.getInput("api-token");
const projectId = ghCore.getInput("project-id");
const filePath = ghCore.getInput("file-path");
const downloadOptions = ghCore.getInput("download-options");

async function run() {
    console.log(apiKey, projectId, filePath, downloadOptions)
    const lokalise: LokaliseApi = new LokaliseApi({
        apiKey
    })

    const getZipFile = (fileUrl: string): Promise<AdmZip> => {
        return new Promise((resolve, reject) => {
            const req = https.get(fileUrl, async (res) => {
                const data = [] as any
                let dataLen = 0

                res.on('data', (chunk) => {
                    data.push(chunk)
                    dataLen += chunk.length
                }).on('end', async () => {
                    try {
                        const buf = Buffer.alloc(dataLen)
                        for (let i = 0, len = data.length, pos = 0; i < len; i++) {
                            data[i].copy(buf, pos)
                            pos += data[i].length
                        }

                        const zip = new AdmZip(buf)
                        resolve(zip)
                    } catch (e) {
                        reject(e)
                    }
                })
            })

            req.on('error', (err) => {
                reject(err)
            })
        })
    }
    let options = {}
    try {
        options = downloadOptions ? JSON.parse(downloadOptions) : {}
    } catch {
        options = {}
    }
    const file: Keyable = await lokalise.files.download(
        projectId,
        {
            format: 'json',
            original_filenames: false,
            bundle_structure: filePath,
            export_sort: 'first_added',
            replace_breaks: false,
            ...options
        } as DownloadFileParams
    )

    const zip: AdmZip = await getZipFile(file.bundle_url)
    const zipEntries = zip.getEntries()

    for (let i = 0; i < zipEntries.length; i++) {
        console.log(zipEntries[i].entryName)
        fs.writeFile(zipEntries[i].entryName, zip.readAsText(zipEntries[i]), function(err) {
            if(err) {
                return console.log(err);
            }
        })
    }
}

run()