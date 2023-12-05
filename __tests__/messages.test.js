const db = require("../db");
const User = require("../models/user");
const Message = require("../models/message");


describe("Test Message class", function () {

  beforeEach(async function () {
    try {
      await db.query("DELETE FROM messages");
      await db.query("DELETE FROM users");
      await db.query("ALTER SEQUENCE messages_id_seq RESTART WITH 1");

      let u1 = await User.register({
        username: "test1",
        password: "password",
        first_name: "Test1",
        last_name: "Testy1",
        phone: "+14155550000",
      });
      console.log('Created User:', u1);
      let u2 = await User.register({
        username: "test2",
        password: "1password",
        first_name: "Test2",
        last_name: "Testy2",
        phone: "+14155552222",
      });
      console.log('Created User:', u2);
      let m1 = await Message.create({
        from_username: "test1",
        to_username: "test2",
        body: "u1-to-u2"
      });
      let m2 = await Message.create({
        from_username: "test2",
        to_username: "test1",
        body: "u2-to-u1"
      });
    } catch (error) {
      console.log(`Error in beforeEach: ${error}`);
    }
  });

  test("can create", async function () {
  let m = await Message.create({
    from_username: "test1",
    to_username: "test2",
    body: "new"
  });

  expect(m).toEqual({
    id: expect.any(Number),
    from_username: "test1",
    to_username: "test2",
    body: "new",
    sent_at: expect.any(Date),
  });
});

  test("can mark read", async function () {
    let [m] = await Promise.all([
      Message.create({
      from_username: "test1",
      to_username: "test2",
      body: "new"
      })]);

    expect(m.read_at).toBe(undefined);

    await Message.markRead(m.id);
    
    const result = await db.query("SELECT read_at from messages where id=$1", [m.id]);
    expect(result.rows[0].read_at).toEqual(expect.any(Date));
  });

  test("can get", async function () {
    let u = await Message.get(1);
    console.log('Received Message:', u);
    expect(u).toEqual({
      id: expect.any(Number),
      body: "u1-to-u2",
      read_at: null,
      sent_at: u.sent_at,
      from_user: {
        username: "test1",
        first_name: "Test1",
        last_name: "Testy1",
        phone: "+14155550000",
      },
      to_user: {
        username: "test2",
        first_name: "Test2",
        last_name: "Testy2",
        phone: "+14155552222",
      },
    });
  });
});

afterAll(async function() {
  await db.end();
});
