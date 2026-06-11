import Vapor

actor RateLimiterStorage {
  private var requests: [String: [Date]] = [:]

  func isAllowed(
    ip: String,
    now: Date,
    maxRequests: Int,
    window: TimeInterval
  ) -> Bool {
    var timestamps = requests[ip] ?? []

    timestamps.removeAll {
      now.timeIntervalSince($0) > window
    }

    guard timestamps.count < maxRequests else {
      requests[ip] = timestamps
      return false
    }

    timestamps.append(now)
    requests[ip] = timestamps

    return true
  }
}

final class RateLimiterMiddleware: AsyncMiddleware {
  private let storage = RateLimiterStorage()

  private let maxRequests: Int
  private let window: TimeInterval

  init(
    maxRequests: Int,
    window: TimeInterval
  ) {
    self.maxRequests = maxRequests
    self.window = window
  }

  func respond(
    to request: Request,
    chainingTo next: any AsyncResponder
  ) async throws -> Response {
    let ip = request.remoteAddress?.ipAddress ?? "unknown"

    let allowed = await storage.isAllowed(
      ip: ip,
      now: Date(),
      maxRequests: maxRequests,
      window: window
    )

    guard allowed else {
      throw Abort(
        .tooManyRequests,
        reason: "Rate limit exceeded"
      )
    }

    return try await next.respond(to: request)
  }
}
