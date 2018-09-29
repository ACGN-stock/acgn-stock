import shell from 'shelljs';
import { padZero } from '/common/imports/utils/formatTimeUtils';

// 備份mongo資料庫
export function backupMongo(suffix = '') {
  const url = process.env.MONGO_URL;
  const path = process.env.BACKUP_DIRECTORY;
  if (url && path) {
    console.log('backup mongo from ' + url + ' to ' + path + '...');
    const match = url.match(/mongodb:\/\/([^/]*)\/(.*)/);
    if (match && match[1] && match[2]) {
      const command1 = '/usr/bin/mongodump -h ' + match[1] + ' -d ' + match[2] + ' -o ' + path + '/dump';
      console.log(command1);
      shell.exec(command1);
      const now = new Date();
      const nowString = now.getFullYear() + '-' + padZero(now.getMonth() + 1) + '-' + padZero(now.getDate()) + suffix;
      const command2 = 'tar zcvf ' + path + '/' + nowString + '.tar.gz ' + path + '/dump';
      console.log(command2);
      shell.exec(command2);
      shell.rm('-rf', path + '/dump');
    }
    else {
      console.error(`can't fetch domain/port/database from url!`);
    }
  }
  else {
    console.log(`can't backup mongo because no available environment variable given!`);
  }
}
export default backupMongo;
