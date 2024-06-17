export const borrowQuery = () => {
    return `
        query fetchUsers($reserveId: String, $blockNumber: Int) {
            userReserves(where: {reserve_: {id: $reserveId}}, block: {number: $blockNumber}, orderBy:currentTotalDebt, orderDirection:desc, first: 20) {
                id
                currentTotalDebt
                user {
                    id
                }
            }
        }
  `
}