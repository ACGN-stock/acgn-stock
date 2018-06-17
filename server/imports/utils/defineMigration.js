import { Migrations } from 'meteor/percolate:migrations';
import { Promise } from 'meteor/promise';

const existingVersions = new Set();

/**
 * 包裝 percolate:migrations 的 Migrations.add
 * 以讓 up/down 動作可以支援 async-await 語法（透過 meteor/promise 的 Promise.await）
 * 並且檢查是否有重複的 version 定義。
 *
 * @param {Object} migration - migration 定義
 * @param {Nubmber} migration.version - migration 的唯一版本號
 * @param {Function} migration.up - migration 的升級動作（可為 async function）
 * @param {Function?} migration.down - migrations 的降級動作（可為 async function）
 * @returns {void}
 */
export function defineMigration({ version, name, up, down }) {
  if (existingVersions.has(version)) {
    throw new Error(`Redefinition of migration version ${version}!`);
  }

  existingVersions.add(version);

  const migration = { version, name };

  if (up) {
    if (typeof up !== 'function') {
      throw new Error('`up` is not a function!');
    }

    migration.up = function() {
      Promise.await(up());
    };
  }

  if (down) {
    if (typeof down !== 'function') {
      throw new Error('`down` is not a function!');
    }

    migration.down = function() {
      Promise.await(down());
    };
  }

  Migrations.add(migration);
}
