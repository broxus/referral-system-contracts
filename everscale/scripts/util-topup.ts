import { Address, AddressLiteral, fromNano, toNano, zeroAddress } from "locklift";

import process from "process"
import prompt from "prompt"

const schema = {
  properties: {
    owner: {
      pattern: /^(?:-1|0):[0-9a-fA-F]{64}$/,
      message: 'Must Be Valid Ton Address',
      required: true
    },
    value: {
      type: 'number',
      message: 'Must be Number',
      required: true,
    }
  }
};

async function main() {
  console.log("Topup from Giver:")
  prompt.start()
  let {owner, value} = await prompt.get(schema)
  let ownerAddr = new Address(owner);
  locklift.giver.sendTo(ownerAddr, value)

  console.log(`Sending ${fromNano(value)} Evers to with ${owner}`);
  let { confirm } = await prompt.get([{name: 'confirm', message: 'Confirm? (t(True)/f(False))', type: 'boolean'}])
  if (!confirm) return;
  console.log(`${value} Evers Sent to ${owner}}`);
}

main()
  .then(() => process.exit(0))
  .catch(e => {
    console.log(e);
    process.exit(1);
  });
