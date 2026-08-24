# Resort Calendar Capability

## Invariants

- Admin owns resort master data, package catalog, and staff-to-resort assignment.
- A resort is operationally ready only when it has at least one active Internal staff member and one active External staff member.
- New resorts start inactive. Admin may activate a resort only after staffing coverage is ready.
- Admin may assign staff to an inactive resort while preparing it for activation.
- Admin cannot deactivate a resort with pending, active, or rescheduled bookings.
- Admin cannot move, deactivate, or change the role of the last active Internal or External staff member while that resort has open bookings.
- Internal staff manages Sky Guide events and observation spots only for their assigned resort.
- External staff can read its resort catalog and create bookings, but cannot approve or operate them.
- External bookings start as `pending`; approval by an internal staff member from the same resort activates the booking and assigns that internal staff member.
- Packages are reusable products. Sky events are dated occurrences that may reference a package and override its price.
- Public resort pages show only active packages and published, non-ended events for seven local calendar dates: today through today + 6 in the resort timezone.
- Browser coordinates are used only to choose the nearest active resort and are not persisted.
- A staff member's assigned resort is administrative master data, not their live GPS location.

## Deferred

- Hotel and independent agent platforms remain out of scope.
- Automatic background location tracking, recurring event rules, and a separate media upload pipeline are not required.
- Creating staff credentials or an invitation flow is separate from resort assignment and remains deferred.
- “Photo of the Moon” remains a package inclusion, not a separate product type.
