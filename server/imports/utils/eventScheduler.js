import { _ } from 'meteor/underscore';

import { dbEventSchedules } from '/db/dbEventSchedules';

// 利用 dbScheduledEvents 進行事件觸發的排程
export const eventScheduler = {
  // 對應事件 ID 的回呼
  eventCallbacks: {},

  // 設定 eventId 事件觸發時的回呼
  setEventCallback(eventId, callback) {
    this.eventCallbacks[eventId] = callback;
  },

  // 是否已有相同事件 ID 的排程
  isEventScheduled(eventId) {
    return !! dbEventSchedules.find(eventId).count();
  },

  // 排程事件 ID 的觸發時間
  scheduleEvent(eventId, scheduledAt) {
    dbEventSchedules.upsert(eventId, { $set: { scheduledAt } });
  },

  /**
   * 定義重覆事件，在觸發之後自動排程下一次觸發的時間。
   *
   * @param {String} eventId 事件ID
   * @param {function(): void} onTriggered 事件觸發時的回呼
   * @param {function(): Date | Number} nextScheduledAt 產生下一次事件觸發排程時間的 function
   * @returns {void}
   */
  defineRecurringEvent(eventId, { onTriggered, nextScheduledAt }) {
    this.setEventCallback(eventId, () => {
      this.scheduleEvent(eventId, nextScheduledAt());
      onTriggered();
    });

    // 若重覆事件未排程，則進行第一次排程
    if (! this.isEventScheduled(eventId)) {
      this.scheduleEvent(eventId, nextScheduledAt());
    }
  },

  // 觸發事件並從資料庫移除所有過期的事件
  triggerOverdueEvents() {
    const overdueEvents = dbEventSchedules
      .find({
        scheduledAt: { $lte: new Date() }
      }, {
        sort: { scheduledAt: 1 }
      })
      .fetch();

    dbEventSchedules.remove({ _id: { $in: _.pluck(overdueEvents, '_id') } });

    overdueEvents.forEach(({ _id: eventId }) => {
      try {
        this.eventCallbacks[eventId]();
      }
      catch (err) {
        console.error(`error occured when triggering event '${eventId}': `, err);
      }
    });
  }
};
