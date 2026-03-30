function createAppointmentLibraryService(deps) {
  const {
    loanService,
    seatReservationService,
    serviceAppointmentService,
    extractPageContent,
    isActiveLoan,
    normalizeDateTimeInput,
  } = deps

  return {
    async getAppointments() {
      const response = await serviceAppointmentService.getMyAppointments(0, 50)
      return extractPageContent(response)
    },

    async getActiveLoans() {
      const loans = await loanService.getMyLoans()

      return (loans || []).filter(isActiveLoan)
    },

    createAppointment(payload) {
      return serviceAppointmentService.createAppointment({
        serviceType: payload.serviceType,
        method: payload.method,
        scheduledTime: normalizeDateTimeInput(payload.scheduledTime),
        loanId: Number(payload.loanId) > 0 ? Number(payload.loanId) : undefined,
        returnLocation: payload.returnLocation || undefined,
        notes: String(payload.notes || '').trim() || undefined,
      })
    },

    cancelAppointment(appointmentId) {
      return serviceAppointmentService.cancelAppointment(Number(appointmentId))
    },

    getSeats(params) {
      return seatReservationService.getSeats({
        floorName: params && params.floorName,
        zoneName: params && params.zoneName,
        startTime: normalizeDateTimeInput(params && params.startTime),
        endTime: normalizeDateTimeInput(params && params.endTime),
        availableOnly: params && params.availableOnly,
      })
    },

    getMySeatReservations() {
      return seatReservationService.getMyReservations()
    },

    createSeatReservation(payload) {
      return seatReservationService.createReservation({
        seatId: Number(payload.seatId),
        startTime: normalizeDateTimeInput(payload.startTime),
        endTime: normalizeDateTimeInput(payload.endTime),
        notes: String(payload.notes || '').trim() || undefined,
      })
    },

    cancelSeatReservation(reservationId) {
      return seatReservationService.cancelReservation(Number(reservationId))
    },
  }
}

module.exports = {
  createAppointmentLibraryService,
}
