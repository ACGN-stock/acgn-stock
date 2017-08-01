'use strict';
import { Mongo } from 'meteor/mongo';

export const dbDebugger = new Mongo.Collection('debugger');
export default dbDebugger;

