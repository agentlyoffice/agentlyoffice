import { BRAND, CHAIN, LAUNCHPAD, TOKEN } from "@/config/brand";
import { CONTRACT_NAMES, ledgerLive } from "@/config/contracts";

/** Questions and answers shown on /docs (and in its FAQPage data). Answers follow the token and contract state. */
export function faqs(): { q: string; a: string }[] {
  const live = TOKEN.isLive;
  return [
    {
      q: `What is ${BRAND.name}?`,
      a: `${BRAND.name} is a virtual agent office on ${BRAND.chainName}. You assign a task with the sources to read; a researcher, a writer and a reviewer agent pass it desk to desk in a pixel office you can walk through, and you approve the result. An approved result can be recorded on chain as two fingerprints.`,
    },
    {
      q: `How does ${BRAND.name} work?`,
      a: "The researcher picks the source sentences that answer your brief, the writer fills a draft template from those picks with a source tag on every line, and the reviewer runs a fixed checklist. Sensitive tasks stop for your OK after research. Nothing is final until you approve it at the review desk.",
    },
    {
      q: "Do the agents make things up?",
      a: "The built-in methods cannot: the researcher only copies sentences from your sources and the writer only arranges them. When the site owner switches on the optional AI model, it is told to answer only from your sources, and the reviewer still flags lines whose words are not found in the cited source.",
    },
    {
      q: "Where are my tasks stored?",
      a: "In your own browser (local storage): tasks, sources, drafts, permissions and the timeline. They are sent nowhere unless an agent you allowed uses the AI model, which then receives the brief and the sources of that task only.",
    },
    {
      q: "What do tool permissions do?",
      a: "Each agent may only use the tools switched on at the elevator: reading pasted sources, reading Robinhood Chain, using the AI model, writing templates, running the checklist, exporting files. A step that needs a tool its agent does not have stops the task with the reason, and you can retry after changing the switches.",
    },
    {
      q: "What goes on chain?",
      a: `Only when you choose to record an approval: the keccak-256 hash of the task file, the hash of the result, the number of agent steps and your wallet address, in ${CONTRACT_NAMES.ledger}. ${ledgerLive() ? "The contract is live." : "The contract is written and tested but not deployed yet, so recording is a practice signature for now."} Texts never go on chain.`,
    },
    {
      q: `Which network is ${BRAND.name} on?`,
      a: `${CHAIN.name} (chain id ${CHAIN.id}), with ETH for gas. The wallet dialog adds the network to your wallet when you connect.`,
    },
    {
      q: `How do I buy ${BRAND.symbol}?`,
      a: live
        ? `${BRAND.symbol} trades on ${LAUNCHPAD.name}, the ${CHAIN.name} launchpad. Always copy the contract address from this site and compare it before you buy.`
        : `${BRAND.symbol} has not launched yet. It will launch on ${LAUNCHPAD.name}, and its contract address will be published on this site first. Ignore any address that does not come from here.`,
    },
    {
      q: `What is ${BRAND.symbol} for?`,
      a: "Planned uses are task credits, more workspace capacity and premium office features once hosted agents exist. None of that is live, and the office works fully without the token. It carries no promise of price, yield or reward.",
    },
    {
      q: "Do I need a wallet?",
      a: "No. Assigning, running and approving tasks all work without one. A wallet is needed only to sign an approval record.",
    },
    {
      q: "What are the risks?",
      a: "Drafts can still be wrong when the sources are wrong, so read them before you use them. Browser storage can be cleared, so download task files you want to keep. Tokens can lose all value. The ledger proves that an address recorded two hashes, not that the content is true.",
    },
  ];
}
