const fs = require('fs');
const path = require('path');
const s3Config = require('./s3Config.json');

const AWS = require('aws-sdk');
AWS.config.region = s3Config.region;

const s3Object = new AWS.S3(s3Config);
const targetPrefix = 'dist';

(async () => {
    const keyList = await listAllKeys();
    console.log(keyList);
    for( const item of keyList ) {
        await s3Download(s3Object, s3Config, item.Key, targetPrefix);
    }
    console.log('down end');
})()

function listAllKeys() {
    return new Promise((resolve, reject) => {
        s3Object.listObjects({ Bucket: s3Config.bucket }, function (err, data) {
            if(err) {
                return reject(err);
            }
            resolve(data.Contents);
        });
    })
}

// 공백제거
// key.replace(/(\s*)/g,"") 
// 모든 특수 문자 제거 
// 폴더 구조 역시 다 깨진다
// const regExp = /[\{\}\[\]\/?.,;:|\)*~`!^\-+<>@\#$%&\\\=\(\'\"]/gi;

// 폴더 문자와 확장자 사라지는거 제외
const regExp = /[\{\}\[\]?,;:|\)*~`!^\-+<>@\#$%&\\\=\(\'\"]/gi;
 
function s3Download(s3Object, s3Config, key, targetPrefix) {
    return new Promise(async (resolve, reject) => {
        var options = {
            Bucket: s3Config.bucket,
            Key: key,
        };

        key = key.replace(regExp,"");
        key = `${targetPrefix}/${key}`;

        console.log(`downloading -- ${key}`)
    
        await ensureDirectoryExistence(key);
        var writeStream = fs.createWriteStream(key);
        let readStream = s3Object.getObject(options).createReadStream()
    
        let filePromise = new Promise((resolve, reject) => {
            writeStream.on('finish', () => {
                resolve();
            });
            writeStream.on('error', (err) => {
                reject();
            })
        })
    
        readStream.pipe(writeStream);
    
        try {
            await filePromise;
        } catch (err) {
            console.log(err);
        }

        resolve()
    })
}

async function ensureDirectoryExistence(filePath) {
    var dirname = path.dirname(filePath);
    if (fs.existsSync(dirname)) {
        return true;
    }
    await ensureDirectoryExistence(dirname);
    fs.mkdirSync(dirname);
}