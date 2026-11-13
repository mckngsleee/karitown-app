# Karitown business process

How a junkshop buys scrap from sellers and sells a truck load to a buyer, before and with Karitown.

The rules behind each step are in [business-rules.md](business-rules.md).

## As-is: notebook and calculator

<img width="1521" height="401" alt="asis drawio" src="https://github.com/user-attachments/assets/6b17614c-bdf5-48bb-afe5-e7cb0c2a1cd1" />

1. A seller arrives with scrap.
2. The owner weighs each material and computes the amount by hand.
3. The owner pays the seller in cash and logs the transaction in a notebook.
4. When the truck looks full, the owner calls a buyer.
5. The buyer arrives, the owner hands over the load, and the buyer pays.
6. The owner adds up the notebook to work out the profit.

### Pain points

The numbers match the notes on the diagram.

| # | Pain point | Where | Effect |
|---|---|---|---|
| 1 | Miscalculation | Compute amount by hand | The seller is overpaid or underpaid |
| 2 | Missing records | Log transaction | An entry is skipped or the notebook is lost |
| 3 | Judged by eye | Truck looks full? | The buyer is called too early or too late |

Profit is also known only after adding up the notebook by hand, which is slow and repeats any earlier mistake.

## To-be: with Karitown

<img width="1521" height="590" alt="tobe drawio" src="https://github.com/user-attachments/assets/d5fd7e56-c706-433e-8391-4438aa69780a" />

1. A seller arrives with scrap. The owner selects the seller in the app.
2. The owner weighs each material and enters the weight. The app calculates the amount.
3. The owner pays the seller and saves the purchase.
4. The app saves the purchase on the phone and adds it to the open load.
5. When the truck is full, the owner closes the load and chooses a buyer.
6. The buyer arrives. The owner hands over the load and marks it as picked up.
7. The owner records the sale using the buyer's weight and payment. The app calculates the margin.

Purchases and sales upload to the server when the phone is online. The server checks the API key and the rules, then saves each record once in DynamoDB. A change that fails the checks is refused.

### What changed

| Pain point | Fix in Karitown |
|---|---|
| Miscalculation | The app calculates every amount from the weight and the price list |
| Missing records | Every purchase is saved on the phone and backed up on the server |
| Judged by eye | The app tracks the load's weight against the truck's capacity |
| Profit added up by hand | The app calculates the margin when the sale is recorded |

The owner does about the same number of steps as before. Karitown does not remove steps. It removes the hand calculation, the notebook, and the guesswork from them.
