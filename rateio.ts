// Types

type Participant = { id: string; name: string };

type Transaction = { from: string; to: string; amount: number };

type Expense = {
  id: string;
  description: string;
  amount: number;
  paidBy: string;
  splitBetween: string[];
};

// Functions

const sumReducer = (a: number, b: number) => a + b;
const roundMoney = (value: number) => Math.round(value * 100) / 100;

// Baseado nas despesas, são criadas transações de quem deve pagar para quem, considerando o valor total da despesa dividido igualmente entre os participantes
function buildTransactionsFromParticipantsAndExpenses(
  participants: Participant[],
  expenses: Expense[],
): Transaction[] {
  const transactions: Transaction[] = [];
  for (const expense of expenses) {
    const participantsOwnedAmount = roundMoney(
      expense.amount / expense.splitBetween.length,
    );
    for (const participantId of expense.splitBetween) {
      if (participantId === expense.paidBy) continue;
      const transaction = {
        from: participantId,
        to: expense.paidBy,
        amount: participantsOwnedAmount,
      };
      transactions.push(transaction);
    }
  }
  return transactions;
}

// Transações com mesma origem e destinatários são somadas para simplificar o processo de pagamento
function aggregateSameOriginAndDestinationTransactions(
  transactions: Transaction[],
): Transaction[] {
  const joinTransactions = transactions.reduce(
    (acc: Transaction[], transaction) => {
      const existingTransaction = acc.find(
        t => t.from === transaction.from && t.to === transaction.to,
      );
      if (existingTransaction) {
        existingTransaction.amount = roundMoney(
          existingTransaction.amount + transaction.amount,
        );
      } else {
        acc.push(transaction);
      }
      return acc;
    },
    [],
  );
  return joinTransactions;
}

// Transações são simplificadas abatendo credito e divida para não precisar devolver dinheiro de quem envia e recebe
function simplifyAggregatedTransactions(
  transactions: Transaction[],
): Transaction[] {
  const simplifiedTransactions: Transaction[] = [];

  for (const transaction of transactions) {
    const oppositeTransaction = transactions.find(
      t => t.from === transaction.to && t.to === transaction.from,
    );
    if (oppositeTransaction) {
      const difference = roundMoney(
        transaction.amount - oppositeTransaction.amount,
      );
      if (difference > 0) {
        simplifiedTransactions.push({ ...transaction, amount: difference });
      }
    } else {
      simplifiedTransactions.push(transaction);
    }
  }
  return simplifiedTransactions;
}

// Transações são simplificadas novamente para transferir dívidas e reduzir o número de transferencias entre participantes
function simplifyTransactionsWithDebtPurchase(
  participants: Participant[],
  simplifiedTransactions: Transaction[],
): Transaction[] {
  const balanceByParticipant = participants.reduce(
    (map, { id }) => map.set(id, 0),
    new Map<string, number>(),
  );

  for (const transaction of simplifiedTransactions) {
    const fromBalance = balanceByParticipant.get(transaction.from) ?? 0;
    const toBalance = balanceByParticipant.get(transaction.to) ?? 0;

    balanceByParticipant.set(
      transaction.from,
      roundMoney(fromBalance - transaction.amount),
    );
    balanceByParticipant.set(
      transaction.to,
      roundMoney(toBalance + transaction.amount),
    );
  }

  const debtors = Array.from(balanceByParticipant.entries())
    .filter(([, balance]) => balance < 0)
    .map(([participantId, balance]) => ({
      participantId,
      amount: roundMoney(Math.abs(balance)),
    }));

  const creditors = Array.from(balanceByParticipant.entries())
    .filter(([, balance]) => balance > 0)
    .map(([participantId, balance]) => ({
      participantId,
      amount: roundMoney(balance),
    }));

  const directTransactions: Transaction[] = [];

  let debtorIndex = 0;
  let creditorIndex = 0;

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];

    const amount = roundMoney(Math.min(debtor.amount, creditor.amount));

    directTransactions.push({
      from: debtor.participantId,
      to: creditor.participantId,
      amount,
    });

    debtor.amount = roundMoney(debtor.amount - amount);
    creditor.amount = roundMoney(creditor.amount - amount);

    if (debtor.amount === 0) debtorIndex++;
    if (creditor.amount === 0) creditorIndex++;
  }
  return directTransactions;
}

// Helpers

const logTransaction = (transaction: Transaction) => {
  const from = getPartcipantNameById(transaction.from).padEnd(8, ' ');
  const to = getPartcipantNameById(transaction.to).padEnd(8, ' ');
  console.log(from, '->', to, 'R$', transaction.amount);
};

const logTitle = (title: string) => {
  console.log('-'.repeat(50));
  console.log(title);
  console.log('-'.repeat(50));
};

const getPartcipantNameById = (id: string) =>
  participants.find(p => p.id === id)!.name;

// Data
const participants: Participant[] = [
  { id: '1', name: 'Yuri' },
  { id: '2', name: 'Rodrigo' },
  { id: '3', name: 'Geovane' },
];

const expenses: Expense[] = [
  {
    id: '1',
    description: 'Combustível',
    amount: 93.81,
    paidBy: '1',
    splitBetween: ['1', '2', '3'],
  },
  {
    id: '2',
    description: 'Pedágios',
    amount: 36.95,
    paidBy: '1',
    splitBetween: ['1', '2', '3'],
  },
  {
    id: '3',
    description: 'Estacionamento',
    amount: 17,
    paidBy: '3',
    splitBetween: ['1', '2', '3'],
  },
  {
    id: '4',
    description: 'Lanche',
    amount: 66,
    paidBy: '2',
    splitBetween: ['1', '2'],
  },
];

// Demo

function main() {
  logTitle('Despesas');
  expenses.forEach(expense => {
    console.log(
      'R$',
      expense.amount,
      expense.description,
      '- pago por',
      `[${getPartcipantNameById(expense.paidBy)}]`,
    );
    console.log(
      'Dividido entre',
      `[${expense.splitBetween.map(getPartcipantNameById).join(', ')}]\n`,
    );
  });

  logTitle('Todas as Transações');
  const transactions = buildTransactionsFromParticipantsAndExpenses(
    participants,
    expenses,
  );
  transactions.forEach(logTransaction);

  logTitle('Transações somadas (mesmo destino e origem)');
  const joinTransactions =
    aggregateSameOriginAndDestinationTransactions(transactions);
  joinTransactions.forEach(logTransaction);

  logTitle('Transações simplificadas (abate divida e crédito)');
  const simplifiedTransactions =
    simplifyAggregatedTransactions(joinTransactions);
  simplifiedTransactions.forEach(logTransaction);

  logTitle('Transações simplificadas (repasse de dividas)');
  const directTransactions = simplifyTransactionsWithDebtPurchase(
    participants,
    simplifiedTransactions,
  );
  directTransactions.forEach(logTransaction);
}

main();
