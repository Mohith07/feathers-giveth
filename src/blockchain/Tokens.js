import Contract from 'web3-eth-contract';
import { toBN } from 'web3-utils';
import { LPPDac } from 'lpp-dac';

import { getTokenInformation } from './helpers';

const GenerateTokenEvent = {
  anonymous: false,
  inputs:
    [{ indexed: true, name: 'liquidPledging', type: 'address' },
      { indexed: false, name: 'addr', type: 'address' },
      { indexed: false, name: 'amount', type: 'uint256' }],
  name: 'GenerateTokens',
  type: 'event',
  signature: '0xf8a6cdb77a67632a46c21be3e7ca9b2519ecd39d21e514f9222c5b2f19ce23ed',
};

const decodeEventABI = Contract.prototype._decodeEventABI.bind(GenerateTokenEvent);


/**
 * class to track donation token balances
 */
class Tokens {
  constructor(app, web3) {
    this.app = app;
    this.web3 = web3;
    this.tokens = this.app.service('tokens');
  }

  tokensGenerated(event) {
    const decodedEvent = decodeEventABI(event);
    console.log('handling GenerateTokens Event: ', decodedEvent); // eslint-disable-line no-console

    // This is a hacky solution for now, but should define an interface for these token plugins
    // TODO define token plugin interface or fetch token address from dacs/campains service
    new LPPDac(this.web3, decodedEvent.address)
      .token()
      .then(tokenAddress =>
        this.tokens.find({
          query: { tokenAddress, userAddress: decodedEvent.returnValues.addr },
          paginate: false,
        })
          .then((data) => {
            if (data.length === 0) {
              return getTokenInformation(this.web3, tokenAddress)
                .then(tokenInfo => this.tokens.create({
                  tokenAddress,
                  tokenName: tokenInfo.name,
                  tokenSymbol: tokenInfo.symbol,
                  balance: decodedEvent.returnValues.amount,
                  userAddress: decodedEvent.returnValues.addr,
                }));
            }
            const t = data[0];

            const balance = toBN(t.balance).add(toBN(decodedEvent.returnValues.amount)).toString();

            return this.tokens.patch(t._id, { balance });
          }))
      .catch(console.error); // eslint-disable-line no-console
  }
}

export default Tokens;
