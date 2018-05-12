import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';

import { roleDisplayName, getManageableRoles, isRoleManageable } from '/db/users';
import { alertDialog } from '../layout/alertDialog';
import { paramUserId, paramUser } from './helpers';

Template.accountInfoManageRolePanel.helpers({
  roleDisplayName,
  manageableRoles() {
    return getManageableRoles(Meteor.user());
  },
  assignableRoles() {
    const user = paramUser();

    return getManageableRoles(Meteor.user()).filter((role) => {
      return ! user.profile.roles.includes(role);
    });
  },
  isRoleManageable(role) {
    return isRoleManageable(Meteor.user(), role);
  }
});

Template.accountInfoManageRolePanel.events({
  'submit form[name="assignRoleForm"]'(event, templateInstance) {
    event.preventDefault();

    const userId = paramUserId();
    const user = paramUser();
    const role = templateInstance.$('select[name="role"]').val();

    if (! role) {
      return;
    }

    alertDialog.prompt({
      title: '指派身份組',
      message: `請輸入將使用者「${user.profile.name}」<span class="text-success">加入</span>至<span class="text-info">${roleDisplayName(role)}</span>身分組的理由：`,
      callback: (reason) => {
        if (! reason) {
          return;
        }

        Meteor.customCall('assignUserRole', { userId, role, reason });
      }
    });
  },
  'click a[data-unassign-role]'(event, templateInstance) {
    event.preventDefault();

    const userId = paramUserId();
    const user = paramUser();
    const role = templateInstance.$(event.currentTarget).attr('data-unassign-role');

    if (! role) {
      return;
    }

    alertDialog.prompt({
      title: '解除身份組',
      message: `請輸入將使用者「${user.profile.name}」從<span class="text-info">${roleDisplayName(role)}</span>身份組<span class="text-danger">移除</span>的理由：`,
      callback: (reason) => {
        if (! reason) {
          return;
        }

        Meteor.customCall('unassignUserRole', { userId, role, reason });
      }
    });
  }
});
