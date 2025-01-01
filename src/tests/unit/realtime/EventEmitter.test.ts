// src/tests/unit/realtime/EventEmitter.test.ts

import {assertEquals} from "../../../deps.ts";
import {EventEmitter} from "../../../realtime/EventEmitter.ts";
import {Event} from "../../../realtime/types.ts";

Deno.test("EventEmitter registers and emits events correctly",() => {
    const emitter=new EventEmitter();
    const eventsReceived: Event[]=[];

    const listener=(event: Event) => {
        eventsReceived.push(event);
    };

    emitter.on("TEST_EVENT",listener);

    const testEvent: Event={type: "TEST_EVENT",payload: {data: "test"}};
    emitter.emit(testEvent);

    assertEquals(eventsReceived.length,1);
    assertEquals(eventsReceived[0],testEvent);

    // Emit another event
    const anotherEvent: Event={type: "TEST_EVENT",payload: {data: "another test"}};
    emitter.emit(anotherEvent);

    assertEquals(eventsReceived.length,2);
    assertEquals(eventsReceived[1],anotherEvent);

    // Remove listener and emit event
    emitter.off("TEST_EVENT",listener);
    const finalEvent: Event={type: "TEST_EVENT",payload: {data: "final test"}};
    emitter.emit(finalEvent);

    assertEquals(eventsReceived.length,2); // No change
});
