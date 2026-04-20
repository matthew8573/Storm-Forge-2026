using Microsoft.EntityFrameworkCore;
using NoodleDelivery.Domain.Entities;

namespace NoodleDelivery.Application.Common.Interfaces;

public interface IAppDbContext
{
    DbSet<Driver> Drivers { get; }
    DbSet<Restaurant> Restaurants { get; }
    DbSet<Product> Products { get; }
    DbSet<ProductPrice> ProductPrices { get; }
    DbSet<Order> Orders { get; }
    DbSet<OrderItem> OrderItems { get; }
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
