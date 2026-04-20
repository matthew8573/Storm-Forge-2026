using Microsoft.EntityFrameworkCore;
using NoodleDelivery.Domain.Entities;

namespace NoodleDelivery.Infrastructure.Persistence.Seeders;

public static class DbSeeder
{
    public static async Task SeedAsync(AppDbContext context)
    {
        if (!await context.Products.AnyAsync())
        {
            var now = DateTime.UtcNow;
            context.Products.AddRange(
                new Product { Name = "Pho", IsActive = true, CreatedAt = now, UpdatedAt = now },
                new Product { Name = "Bun", IsActive = true, CreatedAt = now, UpdatedAt = now }
            );
            await context.SaveChangesAsync();
        }
    }
}
