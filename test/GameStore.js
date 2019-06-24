const GameItem = artifacts.require("GameItem");
const GameStore = artifacts.require("GameStore");
// const MockGameStore = artifacts.require('MockGameStore');
const GamePlayer = artifacts.require("GamePlayer");

const utils = require("web3-utils");
assert = {
  ...require("truffle-assertions"),
  ...assert
};

const ItemGameState = {
  NotRegistered: 0,
  Registered: 1
};

async function assertEnum(expected, actual, message) {
  if (actual === undefined) {
    assert.fail(message);
  }
  assert.equal(
    expected,
    actual,
    `Expected enum [${expected}] == [${actual}] ${message}`
  );
}

async function get(item, prop, isnum) {
  const val = (await item.GetProps.call())[prop];
  if (isnum) {
    return utils.hexToNumber(val);
  } else {
    return val;
  }
}

contract("GameStore", accounts => {
  let store;
  let owner;
  let player;
  let gameAccounts;

  before(async () => {
    console.log("creating gamestore");
    owner = accounts[0];
    console.log("owner", owner);
    assert.notEqual(owner, "0x0000000000000000000000000000000000000000");
    assert.isDefined(accounts[1]);
  });

  it("GetAccount and RegisterAccount, GetMyAccount", async () => {
    const game = await GameStore.new(owner);
    const account = await game.GetAccount.call(owner);
    assert.equal(account.exists, false, "account should not exist");

    await game.RegisterAccount(accounts[1]);
    const account2 = await game.GetAccount.call(accounts[1]);
    assert.equal(account2.exists, true, "account should exist");

    await game.GetMyAccount.call({ from: accounts[1] });
  });

  it("GetAllItems, RegisterMyItem, RegisterAccount", async () => {
    const game = await GameStore.new(owner);
    const items = await game.GetAllItems.call();
    console.log(items);
    assert.equal(items.length, 0, "should be no items yet");

    await game.RegisterAccount(owner);

    const item = await GameItem.new(game.address, "x", "x", "x");
    await game.RegisterMyItem(item.address);

    const items1 = await game.GetAllItems.call();
    assert.equal(items1.length, 1, "should be 1 items");

    const item2 = await GameItem.new(game.address, "x", "x", "x");
    await game.RegisterMyItem(item2.address);

    const items2 = await game.GetAllItems.call();
    assert.equal(items2.length, 2, "should be 2 items");
  });

  it("PurchaseItem", async () => {
    const game = await GameStore.new(owner);
    await game.RegisterAccount(owner);
    await game.RegisterAccount(accounts[1]);

    const item = await GameItem.new(game.address, "x", "x", "x");
    await game.RegisterMyItem(item.address);
    await item.SetPrice(1023);
    await game.PurchaseItem(item.address, { from: accounts[1], value: 1023 });
  });

  it("PurchaseItem:revert item not registered to the store", async () => {
    const game = await GameStore.new(owner);
    const game2 = await GameStore.new(owner);
    await game.RegisterAccount(owner);
    await game2.RegisterAccount(owner);

    const item = await GameItem.new(game2.address, "x", "x", "x");
    await game2.RegisterMyItem(item.address);
    await item.SetPrice(1023);

    //try to purchase item that is registered to a different game
    await assert.reverts(
      game.PurchaseItem(item.address, { from: owner, value: 1023 }),
      "Item must be registered with this game"
    );
  });

  it("PurchaseItem:revert Item must be marked registered", async () => {
    const game = await GameStore.new(owner);
    await game.RegisterAccount(owner);

    const item = await GameItem.new(game.address, "x", "x", "x");
    await item.SetPrice(1023);

    //try to purchase before it is registered
    await assert.reverts(
      game.PurchaseItem(item.address, { from: owner, value: 1023 }),
      "Item must be marked registered"
    );
  });

  it("PurchaseItem:revert exact amount is required", async () => {
    const game = await GameStore.new(owner);
    await game.RegisterAccount(owner);
    await game.RegisterAccount(accounts[1]);

    const item = await GameItem.new(game.address, "x", "x", "x");
    await game.RegisterMyItem(item.address);
    await item.SetPrice(1023);

    //try to purchase with the wrong amount
    await assert.reverts(
      game.PurchaseItem(item.address, { from: accounts[1], value: 232 }),
      "Exact amount is required"
    );
  });

  it("PurchaseItem:revert cannot purchase self-owned item", async () => {
    const game = await GameStore.new(owner);
    await game.RegisterAccount(owner);

    const item = await GameItem.new(game.address, "x", "x", "x");
    await game.RegisterMyItem(item.address);
    await item.SetPrice(1023);

    //try to purchase my own item
    await assert.reverts(
      game.PurchaseItem(item.address, { from: owner, value: 1023 }),
      "Owner cannot purchase self-owned item"
    );
  });
});
