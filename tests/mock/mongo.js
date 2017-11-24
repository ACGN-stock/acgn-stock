import sinon from 'sinon';

export const Cursors = sinon.stub();
Cursors.callsFake(function() {
  return {
    count: sinon.stub(),
    fetech: sinon.stub(),
    observe: sinon.stub()
  };
});

const Collection = sinon.stub();
const CollectionImpl = function() {
  this.attachSchema = sinon.stub();
  this.insert = sinon.stub();
  this.update = sinon.stub();
  this.upsert = sinon.stub();
  this.remove = sinon.stub();
  this.findOne = sinon.stub();
  this.find = sinon.stub();
  this.find.returns(new Cursors());
};

Collection.callsFake(function() {
  return new CollectionImpl();
});

export const Mongo = { Collection, Cursors };

const NpmModule = sinon.stub();
NpmModule.prototype.ObjectID = sinon.stub();

export const MongoInternals = { NpmModule };
