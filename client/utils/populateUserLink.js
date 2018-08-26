import { $ } from 'meteor/jquery';
import { _ } from 'meteor/underscore';
import { FlowRouter } from 'meteor/kadira:flow-router';

import { styledValidateTypeMarkHtml } from '/client/utils/helpers';

const specialUserDisplayNameMap = {
  '!none': '無',
  '!system': '系統',
  '!FSC': '金管會'
};

function fetchUserInfo(userId) {
  return new Promise((resolve, reject) => {
    $.ajax({
      url: '/userInfo',
      data: { id: userId },
      dataType: 'json',
      success: (result) => {
        resolve(result);
      },
      error: (xhr, status, err) => {
        reject(err);
      }
    });
  });
}

export async function populateUserLink($container, userId) {
  if (! userId) {
    $container.text('（無資料）');

    return;
  }

  const specialUserDisplayName = specialUserDisplayNameMap[userId];
  if (specialUserDisplayName) {
    $container.text(specialUserDisplayName);

    return;
  }

  try {
    const { name: userName, status, validateType } = await fetchUserInfo(userId);
    const userText = `${styledValidateTypeMarkHtml(validateType)}${_.escape(userName)}`.trim() || '???';
    const path = FlowRouter.path('accountInfo', { userId });

    if (status === 'registered') {
      $container.html(`<a href="${path}">${userText}</a>`);
    }
    else {
      $container.html(userText);
    }
  }
  catch (err) {
    $container.text('???');
  }
}
