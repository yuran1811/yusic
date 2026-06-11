import NIOConcurrencyHelpers
import Vapor

final class RateLimiterMiddleware: AsyncMiddleware {
  private let lock = NIOLock()
  private var requests: [String: [Date]] = [:]

  private let maxRequests: Int
  private let window: TimeInterval

  init(maxRequests: Int, window: TimeInterval) {
    self.maxRequests = maxRequests
    self.window = window
  }

  func respond(
    to request: Request,
    chainingTo next: any AsyncResponder
  ) async throws -> Response {
    let ip = request.remoteAddress?.ipAddress ?? "unknown"
    let now = Date()

    let allowed = lock.withLock {
      var timestamps = requests[ip] ?? []

      timestamps.removeAll {
        now.timeIntervalSince($0) > window
      }

      guard timestamps.count < maxRequests else {
        return false
      }

      timestamps.append(now)
      requests[ip] = timestamps

      return true
    }

    guard allowed else {
      throw Abort(
        .tooManyRequests,
        reason: "Rate limit exceeded"
      )
    }

    return try await next.respond(to: request)
  }
}
